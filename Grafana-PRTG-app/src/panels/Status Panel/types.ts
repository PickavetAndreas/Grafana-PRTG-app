import { SelectableValue } from '@grafana/data';

export interface PiechartOptions {
  piechartElements: SelectableValue[];
  piechartType: SelectableValue;
}

export const defaultPiechartOptions: Partial<PiechartOptions> = {
  piechartElements: [],
  piechartType: { label: 'donut', value: 'donut' },
};
