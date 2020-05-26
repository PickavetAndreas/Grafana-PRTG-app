import { PanelPlugin } from '@grafana/data';
import { TableOptions } from './types';
import { TablePanel } from './TablePanel';
import { TableEditor } from './TableEditor';

export const plugin = new PanelPlugin<TableOptions>(TablePanel).setEditor(TableEditor);
