import { PanelPlugin } from '@grafana/data';
import { SimpleOptions, defaults } from './types';
import { TreePanel } from './TreePanel';
export const plugin = new PanelPlugin<SimpleOptions>(TreePanel).setDefaults(defaults);
