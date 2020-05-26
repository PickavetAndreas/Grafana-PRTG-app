import { PanelPlugin } from '@grafana/data';
import { PiechartOptions } from './types';
import { StatusPanel } from './StatusPanel';
import { StatusEditor } from './StatusEditor';

export const plugin = new PanelPlugin<PiechartOptions>(StatusPanel).setEditor(StatusEditor);
