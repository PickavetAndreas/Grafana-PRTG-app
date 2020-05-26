import React from 'react';
import { PanelProps, DisplayValue, SelectableValue } from '@grafana/data';
import { PieChart } from '@grafana/ui';
import { PiechartOptions } from './types';

type PiechartProps = PanelProps<PiechartOptions>;

export function StatusPanel(Props: PiechartProps) {
  const { options } = Props;
  const piechartData = getPiechartData(Props);
  return (
    <section style={{ margin: 'auto', display: 'flex', flexDirection: 'row' }}>
      <div style={{ margin: 10 }}>
        <PieChart
          values={piechartData}
          width={Props.width}
          height={Props.height - 50}
          pieType={options.piechartType.value}
        ></PieChart>
      </div>
      <div style={{ margin: 'auto', display: 'flex', flexDirection: 'column' }}>
        {piechartData?.map((data: any) => {
          return (
            <div style={{ display: 'flex', flexDirection: 'row' }}>
              <div style={{ height: 5, width: 5, borderRadius: 50, backgroundColor: data.color, margin: 8 }}></div>
              <div style={{ height: 21 }}>
                {data.numeric ? data.numeric : '0'} - {data.title}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

const getPiechartData = (Props: any): DisplayValue[] => {
  const piechartElements: SelectableValue[] = Props.options.piechartElements;
  var displayValueList: DisplayValue[] = [];
  piechartElements.map((piechartElement: SelectableValue) => {
    try {
      var valueNumber = Number(getDataValue(piechartElement.label!, Props));
      displayValueList.push({
        title: piechartElement.label!,
        numeric: valueNumber,
        text: piechartElement.label!,
        color: piechartElement.color,
      });
    } catch (error) {}
  });
  return displayValueList;
};

const getDataValue = (label: string, Props: any) => {
  return Props.data.series[0].fields[0].values.buffer.find((item: any) => item[0] === label)[1];
};
