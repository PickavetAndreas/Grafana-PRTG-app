import React from 'react';
import { PanelProps } from '@grafana/data';
import { TableOptions } from './types';
import { useTable,
  useSortBy
} from 'react-table'
import styled from 'styled-components'
interface Props extends PanelProps<TableOptions> {}

const Styles = styled.div`
  display: block;
  overflow: auto;
  
  table {
    border-spacing: 0;
    border: 1px solid;
    border-color: #202226;
    width: 100%
  }

    thead {
      overflow-y: auto;
      overflow-x: hidden;
    }

    tbody {
      overflow-y: scroll;
      overflow-x: hidden;
    }

    tr {
      :last-child {
        td {
          border-bottom: 0;
        }
      }
      border-bottom: 1px solid;
      border-color: #202226;
    }

    th,
    td {
      margin: 0;
      padding: 0.5rem;

      position: relative;

      :last-child {
        border-right: 0;
      }
    }
    td {
      border-right: 1px solid;
      border-color: #202226;
    }
    th {
      color: #33a2d9;
      background-color: #202226;
      border-right: 1px solid;
      border-color: #141619;
    }
    .resizer {
      display: inline-block;
      background: blue;
      width: 10px;
      height: 100%;
      position: absolute;
      right: 0;
      top: 0;
      transform: translateX(50%);
      z-index: 1;
      touch-action:none;

      &.isResizing {
        background: red;
      }
    }
  }
`
const getHeaders = (headers:string[]) => {
  return (
    headers.map((head:string) => {
        return {
          Header: head,
          accessor: head,
        }
      })
  )
}

const getData = (fieldsAndDatasource:any,headers:any) => {
  let data:any[] = []
  fieldsAndDatasource.map((fieldAndDS:any) => {
    for(let i=0;i<fieldAndDS.fields[0].values.buffer.length;i++){
      var dataElement:any = {datasource: fieldAndDS.datasource}
      headers.map((header:any) => {
        dataElement[header.Header] = fieldAndDS.fields.find((field:any) => field.name === header.Header).values.buffer[i]
      })
      data.push(dataElement)
    }
  })  
  return data
}

export function getHeaderListAndFieldList(props:any) {
  let fieldsList:any[] = []
  let headerList:string[] = []
  props.data.series.map((serie:any) => {
    serie.fields.map((field:any) => {
      if(!headerList.includes(field.name)) headerList.push(field.name)
    })
    fieldsList.push(
      {
        datasource: serie.name,
        fields: serie.fields
      }
    )
  })
  return {fieldlist:fieldsList,headerlist:headerList}
}

export function TablePanel(props:Props) {
  const headersAndFields:any = getHeaderListAndFieldList(props)
  const headers = getHeaders(headersAndFields.headerlist)
  const tabledata = getData(headersAndFields.fieldlist,headers)
  headers.push({Header:"datasource",accessor:"datasource"})
  return (
    <Styles>
      <Table columnWidths={props.options.columnWidthList} columns={headers} data={tabledata} panelHeight={props.height - 16}/> 
    </Styles>
  )
}

function Table({columnWidths,columns,data,panelHeight}:any) {
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
  } = useTable(
    {
      columns,
      data,
    },
    useSortBy
  )

  return (
    <div style={{height:panelHeight}}>
      <table {...getTableProps()}>
        <colgroup>
          {columns.map((column:any)=> (
            <col className={column.Header} span={1} style={{width:`${columnWidths[column.Header] ? columnWidths[column.Header] : 0}%`}}/>
          ))}
        </colgroup>
        <thead>
          {headerGroups.map(headerGroup => (
            <tr {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map((column:any) => (
                <th {...column.getHeaderProps(column.getSortByToggleProps())}>
                  {column.render('Header')}
                  <span>
                    {column.isSorted
                      ? column.isSortedDesc
                        ? ' 🔽'
                        : ' 🔼'
                      : ''}
                  </span>
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody {...getTableBodyProps()}>
          {rows.map(
            (row, i) => {
              prepareRow(row);
              return (
                <tr {...row.getRowProps()}>
                  {row.cells.map(cell => {
                    return (
                      <td {...cell.getCellProps()}>{cell.render('Cell')}</td>
                    )
                  })}
                </tr>
              )}
          )}
        </tbody>
      </table>
    </div>
  )
}