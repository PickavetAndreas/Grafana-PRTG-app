import React, { PureComponent } from 'react';
import { LegacyForms } from '@grafana/ui';
import { PanelEditorProps } from '@grafana/data';
const { FormField } = LegacyForms;
import { TableOptions } from './types';
import {getHeaderListAndFieldList} from './TablePanel'

export class TableEditor extends PureComponent<PanelEditorProps<TableOptions>> {
  constructor(props:any) {
    super(props)
    if(!this.props.options.columnWidthList){
      this.props.options.columnWidthList = {}
    }
  }
  changeColWidth = (width:string,head:string) => {
    this.props.options.columnWidthList ? this.props.options.columnWidthList[head] = Number(width) : this.props.options.columnWidthList = {head:Number(width)}
  }

  render() {
    let headers:any[] = []
    try {
        headers = getHeaderListAndFieldList(this.props).headerlist
        headers.push("datasource")
        return (
          <div className="section gf-form-group">
            <h5 className="section-heading">Column Widths (%)</h5>
            {headers.map((head:string) => {
              return(
                <div style={{margin:5}}>
                  <FormField 
                    label={head}
                    onChange={(e) => this.changeColWidth(e.target.value,head)}
                    value={this.props.options.columnWidthList[head]}
                  ></FormField>
                </div>
              )
            })}
          </div>
        );
    } catch(error){
      return(<div></div>)
    }
    
  }
}

