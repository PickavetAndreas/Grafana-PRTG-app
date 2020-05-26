import React, { PureComponent } from 'react';
import { Select, InlineFormLabel, ColorPicker, PanelOptionsGroup, PieChartType } from '@grafana/ui';
import { PanelEditorProps, SelectableValue } from '@grafana/data';

import { PiechartOptions } from './types';

interface MyState {
  selectedData?: SelectableValue[];
  piechartType?: SelectableValue;
}

export class StatusEditor extends PureComponent<PanelEditorProps<PiechartOptions>, MyState> {
  constructor(props: any) {
    super(props);

    const piechartElements = props.options.piechartElements;
    const piechartType = props.options.piechartType;
    
    this.state = {
      selectedData: piechartElements,
      piechartType: piechartType,
    };
    // this.setState({
    //   selectedData:piechartElements,
    //   piechartType:piechartType
    // })

    console.log(this.state)
  }

  getData = () => {
    var data: any[] = [];
    try {
    } catch (error) {
      Object.entries(this.props.data.series).map((serie: any) => {
        data.push(serie[1].values.status.buffer);
      });
    }
    return data;
  };

  selectDataChange = (input: SelectableValue) => {
    var selectedData: SelectableValue[] = [];
   

    var selectedDatalabels = this.state.selectedData?.map(item => {
      return item.label;
    });

    try {
      input.map((inputObj: SelectableValue) => {
        if (selectedDatalabels?.includes(inputObj.label)) {
          var item = this.state.selectedData?.find((element: SelectableValue) => element.label === inputObj.label);
          selectedData.push(item!);
        } else {
          selectedData.push({
            label: inputObj.label,
            value: inputObj.value,
            color: 'white',
          });
        }
      });
    } catch (error) {}
    this.setState({
      selectedData: selectedData,
    });
    this.props.options.piechartElements = selectedData;
  };

  colorChange = (label: string, color: string) => {
    this.state.selectedData![this.getIndex(label)]!.color = color;
    this.forceUpdate();

    this.props.options.piechartElements = this.state.selectedData!;
  };

  getIndex = (label: string): number => {
    var index = this.state.selectedData?.findIndex((item: any) => item.label === label);
    return index!;
  };

  typePieChartChange = (input: SelectableValue) => {
    this.setState({
      piechartType: input,
    });
    this.props.options.piechartType = input;
  };

  render() {
    return (
      <div>
        <PanelOptionsGroup>
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
            }}
          >
            <div style={{ margin: 5 }}>
              <div style={{ margin: 2 }}>
                <InlineFormLabel width={10}>Data for Piechart:</InlineFormLabel>
              </div>
              <Select
                isMulti={true}
                options={getDataSelectedValues(this.props)}
                value={this.state.selectedData}
                onChange={e => this.selectDataChange(e)}
              ></Select>
            </div>
            <div style={{ margin: 5 }}>
              <div style={{ margin: 2 }}>
                <InlineFormLabel>Type:</InlineFormLabel>
              </div>
              <Select
                isMulti={false}
                value={this.state.piechartType!}
                options={[
                  { label: 'Donut', value: PieChartType.DONUT },
                  { label: 'Pie', value: PieChartType.PIE },
                ]}
                onChange={e => this.typePieChartChange(e)}
              ></Select>
            </div>
          </div>
        </PanelOptionsGroup>
        <PanelOptionsGroup>
          <div>
            {this.state.selectedData?.map(data => {
              return (
                <div style={{ display: 'flex', flexDirection: 'row', margin: 5 }}>
                  <div style={{ margin: 10 }}>
                    <ColorPicker
                      onChange={e => this.colorChange(data.label!, e)}
                      color={this.state.selectedData![this.getIndex(data.label!)].color}
                      enableNamedColors={true}
                    ></ColorPicker>
                  </div>
                  <div>
                    <InlineFormLabel width={20}>{data.label} - Color</InlineFormLabel>
                  </div>
                </div>
              );
            })}
          </div>
        </PanelOptionsGroup>
      </div>
    );
  }
}

const getDataSelectedValues = (Props: any) => {
  var data: SelectableValue[] = [];
  try {
    Object.entries(Props.data.series).map((serie: any) => {
      try {
        Object.entries(serie[1].values.status.buffer).map((item: any) => {
          data.push({
            // this works with status.json... not with raw/table
            // label and value are same because "Select" searches on value
            label: item[1][0],
            value: item[1][0],
          });
        });
      } catch (error) {}
    });
  } catch (error) {}
  return data;
};
