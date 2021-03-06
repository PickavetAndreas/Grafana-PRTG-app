import {
  MetricFindValue,
  DataQueryRequest,
  DataQueryResponse,
  DataSourceApi,
  DataSourceInstanceSettings,
  MutableDataFrame,
  SelectableValue,
  FieldType,
} from '@grafana/data';
import { getDataSourceSrv, getBackendSrv } from '@grafana/runtime';
import { PrtgQuery, PrtgDataSourceOptions, ParameterOptions, monthsShortList } from './types';
import { reduce } from 'lodash';

export function getItems(params: ParameterOptions,jsonData:any) {
  return apiRequest('table', queryParameterBuilder(params),jsonData).then((response: any) => {
    return response.data[params.content!].map((responseItem: any) => {
      return { item: responseItem.name, objid: responseItem.objid };
    });
  });
}

function getChannels(parentId: string,jsonData:any) {
  return apiRequest('chartlegend', `&id=${parentId}`,jsonData).then((response: any) => {
    return response.data.items.map((res: any) => {
      return { item: res.name, unit: res.unit };
    });
  });
}

function queryParameterBuilder(parameters: ParameterOptions): string {
  return reduce(
    parameters,
    function(result, value, label) {
      result += `&${label}=${value}`;
      return result;
    },
    ''
  );
}

export class DataSource extends DataSourceApi<PrtgQuery, PrtgDataSourceOptions>{
  jsonData = {}
  constructor(instanceSettings: DataSourceInstanceSettings<PrtgDataSourceOptions>) {
    super(instanceSettings);
    this.jsonData = instanceSettings.jsonData;
  }


  metricFindQuery(query: string, options: any) {
    var queryContent: string = query.split(':')[0];
    var queryParent: string = query.split(':')[1];
    if (queryParent === '*') {
      //probe_id = 0
      queryParent = '0';
    }
    if (queryParent.charAt(0) === '$') {
      //extract current value for Var
      var dataSource: any = (getDataSourceSrv() as unknown) as DataSourceApi;
      queryParent = dataSource.templateSrv.replace(queryParent);
    }
    return new Promise<MetricFindValue[]>((resolve, reject) => {
      getItems({ id: queryParent, content: `${queryContent}s`, columns: ['name', 'objid'] },this.jsonData).then((response: any) => {
        resolve(
          response.map((responseItem: any) => {
            return { text: responseItem.item, value: responseItem.objid };
          })
        );
      });
    });
  }

  query(options: DataQueryRequest<PrtgQuery>): Promise<DataQueryResponse> {
    const paramOptionsTimeRange: ParameterOptions = {
      sdate: grafDateToPrtgDate(options.range?.from),  
      edate: grafDateToPrtgDate(options.range?.to),
    };
    const promises = options.targets.map((target: any) => {
      switch (target.queryMethod.value.toLowerCase()) {
        case 'table':
          return tableHelper(target, options.scopedVars,this.jsonData);
        case 'historicdata':
          return historicHelper(target, paramOptionsTimeRange, options.scopedVars,this.jsonData);
        case 'raw':
          return rawHelper(target, options.scopedVars,this.jsonData);
        case 'status':
          return statusHelper(target,this.jsonData);
        default:
          return new MutableDataFrame();
      }
    });
    return Promise.all(promises).then(results => ({ data: results }));
  }

  async testDatasource() {
    return apiRequest('status', '', this.jsonData).then((apiRes: any) => {
      if (apiRes.ok) {
        return {
          status: 'success',
          message: 'Success',
        };
      } else {
        return {
          status: 'error',
          message: 'error',
        };
      }
    });
  }
} 

function statusHelper(target: any,jsonData:any) {
  return apiRequest('status', '',jsonData).then((apiResponse: any) => {
    return getStatusDataframe(apiResponse);
  });
}

function rawHelper(target: any, scopedVars: any, jsonData:any) {
  let queryParameterString = target.rawQuerytext;
  const dataSource: any = (getDataSourceSrv() as unknown) as DataSourceApi;
  dataSource.templateSrv.variables.map((grafVar: any) => {
    let regex = new RegExp('\\$' + grafVar.name);
    queryParameterString = queryParameterString.replace(regex, getScopedVarId(`$${grafVar.name}`, scopedVars));
  });

  return apiRequest(target.rawURI, queryParameterString,jsonData).then((apiResponse: any) => {
    return getRawDataframe(apiResponse, target);
  });
}

async function historicHelper(target: any, paramOptionsTimeRange: ParameterOptions, scopedVars: any, jsonData:any) {
  const paramOptions: ParameterOptions = { avg: 0, usecaption: '1' };

  if (Number.isInteger(target.selectedSensor.value)) {
    paramOptions.id = target.selectedSensor.value;
  } else if (target.selectedSensor.value.toString().includes('$')) {
    paramOptions.id = getScopedVarId(target.selectedSensor.value, scopedVars);
  }
  const queryPar = queryParameterBuilder({ ...paramOptions, ...paramOptionsTimeRange });

  const channels = await getChannels(paramOptions.id!,jsonData);
  return apiRequest(target.queryMethod.value, queryPar,jsonData).then((apiResponse: any) => {
    return getHistoricDataframe(apiResponse, target, channels);
  });
}

function tableHelper(target: any, scopedVars: any,jsonData:any) {
  //requested columns, always name
  const cols: string[] = ['name'];
  target.tableColumnItems?.map((colOption: SelectableValue) => cols.push(colOption.value));
  const paramOptions: ParameterOptions = {
    content: target.tableOption.value + 's',
    id: target.selectedGroup.value,
    columns: cols,
  };
  if (Number.isInteger(target.selectedGroup.value)) {
    paramOptions.id = target.selectedGroup.value;
  } else if (target.selectedGroup.value.toString().includes('$')) {
    paramOptions.id = getScopedVarId(target.selectedGroup.value, scopedVars);
  }
  if (target.tableOption.value === 'message') {
    paramOptions.filter_drel = target.messageFilterDrel.value;
  }
  let queryPar = queryParameterBuilder(paramOptions);

  if (target.tableFilterString) {
    queryPar = `${queryPar}&${target.tableFilterString}`;
  }

  return apiRequest(target.queryMethod.value, queryPar,jsonData).then((apiResponse: any) => {
    const mdf = getTableDataframe(apiResponse, target);
    return mdf;
  });
}

function getStatusDataframe(apiResponse: any): MutableDataFrame {
  var mdf = new MutableDataFrame({ refId: '', name: '', fields: [] });
  var statusEntries: any[] = [];
  Object.entries(apiResponse.data).map(statusObj => {
    statusEntries.push(statusObj);
  });
  mdf.addField({
    name: 'status',
    values: statusEntries,
    type: FieldType.other,
  });
  return mdf;
}

function getRawDataframe(apiResponse: any, target: any): MutableDataFrame {
  const content = target.rawQuerytext.match(/(?<=content=).+?(?=\&|$)/).toString();
  const fieldArrays: any = {};
  const mdf = new MutableDataFrame({ refId: '', name: '', fields: [] });
  apiResponse.data[content].map((data: any) => {
    Object.entries(data).map((dataElement: any) => {
      if (!fieldArrays[dataElement[0]]) {
        fieldArrays[dataElement[0]] = [];
      }
      fieldArrays[dataElement[0]].push(dataElement[1]);
    });
  });
  for (const [key] of Object.entries(fieldArrays)) {
    mdf.addField({
      name: `${key}`,
      values: fieldArrays[key],
      type: FieldType.number,
    });
  }
  return mdf;
}

function getTableDataframe(apiResponse: any, target: any): MutableDataFrame {
  var mdf = new MutableDataFrame({ refId: '', name: target.datasource, fields: [] });
  //always name field
  var namelist: string[] = [];

  //for dataframefields
  var requestedColumns: any = {};
  target.tableColumnItems.map(function(item: any) {
    requestedColumns[item['label']] = [];
  });

  apiResponse.data[target.tableOption.value + 's'].map((data: any) => {
    // name
    namelist.push(data.name);
    // data
    target.tableColumnItems.map((col: any) => {
      if (col.value === 'datetime') {
        requestedColumns[col.label].push(prtgDateToGrafDate(data[`${col.value}`]));
      }
      if (col.value.includes('raw') && !isNaN(data[`${col.value}`])) {
        requestedColumns[col.label].push(prtgTimeStampConverter(data[`${col.value}`]));
      } else {
        requestedColumns[col.label].push(data[`${col.value}`]);
      }
    });
  });

  mdf.addField({
    name: 'name',
    values: namelist,
    type: FieldType.string,
  });

  for (const [key] of Object.entries(requestedColumns)) {
    mdf.addField({
      name: `${key}`,
      values: requestedColumns[key],
      type: FieldType.number,
    });
  }
  return mdf;
}

function prtgTimeStampConverter(timestamp: number) {
  return new Date(Date.now() - (timestamp - 25569) * 86400).toUTCString();
}

function getScopedVarId(varLabel: string, scopedVars: any) {
  var dataSource: any = (getDataSourceSrv() as unknown) as DataSourceApi;
  try {
    return dataSource.templateSrv.replace(varLabel, scopedVars);
  } catch (error) {}
}

function getHistoricDataframe(apiResponse: any, target: any, channels: any[]): MutableDataFrame {
  // for pushing data for channels
  var requestedData: any = {};
  var timeList: number[] = [];

  channels.map((channel: any) => {
    requestedData[channel.item] = [];
  });

  var mdf = new MutableDataFrame({ refId: '', name: target.datasource, fields: [] });
  apiResponse.data.histdata.map((historicData: any) => {
    // datetime
    timeList.push(prtgDateToGrafDate(historicData.datetime));

    // data
    channels.map((channel: any) => {
      requestedData[channel.item].push(historicData[channel.item]);
    });
  });

  mdf.addField({
    name: 'Time',
    values: timeList,
    type: FieldType.time,
  });

  for (const [key] of Object.entries(requestedData)) {
    mdf.addField({
      name: `${key} ${channels.find((channel: any) => channel.item === key).unit}`,
      // name: key,
      values: requestedData[key],
      type: FieldType.number,
    });
  }
  return mdf;
}

async function apiRequest(method: string, params: string, jsonData:any) {
  const { username, hostname, passhash, port } = jsonData;
    
  const checkPort = port ? port : '';

  // https://community.grafana.com/t/access-data-source-from-an-app-type-plugin-page/5223/7
  var apiUrl = `https://${hostname}:${checkPort}/api/${method}.json?username=${username}&passhash=${passhash}${params}`;
  if(username && hostname && passhash){
    const apiData: Promise<any> = await getBackendSrv().datasourceRequest({ url: apiUrl, method: 'GET' });
    return apiData;
  }
  
}

function grafDateToPrtgDate(grafdate: any) {
  // Split graf DateTime on space
  var grafSplitted: string[] = grafdate._d.toString().split(' ');
  // find corresponding month value
  var monthValue = monthsShortList.find(item => item.MonthName === grafSplitted[1]);
  // replace ":" in time value to "-"
  var timeReplaced = grafSplitted[4].replace(':', '-');
  var prtgDate = `${grafSplitted[3]}-${monthValue?.MonthIndex}-${grafSplitted[2]}-${timeReplaced}`;
  return prtgDate;
}

function prtgDateToGrafDate(grafdate: any) {
  var prtgDate = grafdate.split(' - ')[0];
  var prtgDateFlipped = `${prtgDate.split('/')[1]}/${prtgDate.split('/')[0]}/${prtgDate.split('/')[2]}`;
  var correctDate = new Date(prtgDateFlipped);
  return correctDate.valueOf();
}
