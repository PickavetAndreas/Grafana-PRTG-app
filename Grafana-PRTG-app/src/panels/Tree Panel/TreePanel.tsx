import React, { PureComponent } from 'react';
import { PanelProps } from '@grafana/data';
import { SimpleOptions } from './types';
import TreeMenu, { ItemComponent } from 'react-simple-tree-menu';
import styled from 'styled-components'
interface Props extends PanelProps<SimpleOptions> {}

var groupsObjids: number[];


const Styles = styled.div`
  display:block
  overflow: auto;

  .rstm-toggle-icon {
    margin-right: 5px;
    padding-right: 5px;
    padding-left: 5px;
  }

  ul {
    max-height:100%;
  }
  .tableContainer, div {
    max-height: 100%;
    overflow-y: scroll;
  }

`

export class TreePanel extends PureComponent<Props> {
  data = this.props.data.series;

  render() {
    return (
      <Styles>
        <div className={"tableContainer"}  style={{maxHeight:this.props.height}}>
          <TreeMenu
            data={this.createTree()}
            onClickItem={e => {
              this.setVar(e.objid, e.parentid);
            }}
          >
            {({ search, items }) => (
              <ul>
                {items.map(({ key, ...props }) => (
                  <ItemComponent key={key}  {...props} style={{ paddingTop:"5px",paddingBottom:"5px",display:"flex", flexDirection:"row", borderBottom:"1px solid", borderColor:"#202226" }} />
                ))}
              </ul>
            )}
          </TreeMenu>     
        </div>
      </Styles>      
    );
  }

  getData = () => {
    var groups: any[] = [];
    var devices: any[] = [];
    Object.entries(this.props.data.series).map((serie: any) => {
      //check type -> device or group
      var typeList = serie[1].fields.find((ser: any) => ser.name === 'type').values.buffer[0];

      switch (typeList) {
        case 'Group':
          groups = serie[1].fields;
          break;
        case 'Device':
          devices = serie[1].fields;
        default:
          break;
      }
    });

    //for setVar()
    groupsObjids = groups.find((group: any) => group.name === 'objid').values.buffer;
    return { groups, devices };
  };

  objectsToTreeNode = (prtgFields: any) => {
    var objectTree: any[] = [];

    prtgFields
      .find((deviceNames: any) => deviceNames.name === 'name')
      .values.buffer.map((devicename: any, index: number) => {
        var toBePushed: any = {
          key: devicename,
          label: devicename,
          objid: prtgFields.find((deviceNames: any) => deviceNames.name === 'objid').values.buffer[index],
          parentid: prtgFields.find((deviceNames: any) => deviceNames.name === 'parentid').values.buffer[index],
          nodes: [],
        };
        objectTree.push(toBePushed);
      });
    return objectTree;
  };

  createTree = () => {
    //get prtg data
    var groupDevices: any = this.getData();
    var groups = groupDevices.groups;
    var devices = groupDevices.devices;

    var devicesTreeNodes = this.objectsToTreeNode(devices);
    var groupsTreeNodes = this.objectsToTreeNode(groups);

    // add all devices to their parent groups
    groupsTreeNodes = this.addItemsToGroups(groupsTreeNodes, devicesTreeNodes);

    // prtg -> root_id = 0 and probe_id=1, but root is group so change root_id to 1 for easy of use
    var rootIndex = groupsTreeNodes.findIndex((group: any) => group.objid === 0);
    groupsTreeNodes[rootIndex].objid = 1;

    //loop over all groups until only root remains
    var thisRoundGroupObjidsandParentIds: any;
    while (groupsTreeNodes.length > 1) {
      thisRoundGroupObjidsandParentIds = this.getObjidAndParentIdList(groupsTreeNodes);
      var toBeAddedGroups: any[] = [];
      thisRoundGroupObjidsandParentIds.objids.map((objid: number) => {
        if (!thisRoundGroupObjidsandParentIds.parentIds.includes(objid)) {
          toBeAddedGroups.push(
            groupsTreeNodes.splice(
              groupsTreeNodes.findIndex((groupNode: any) => groupNode.objid === objid),
              1
            )[0]
          );
        }
      });
      groupsTreeNodes = this.addItemsToGroups(groupsTreeNodes, toBeAddedGroups);
    }

    // only nodes from root returned
    return groupsTreeNodes[0].nodes;
  };

  addItemsToGroups = (groups: any, items: any) => {
    items.map((item: any) => {
      try {
        var parentGroupIndex = groups.findIndex((group: any) => group.objid === item.parentid);
        groups[parentGroupIndex].nodes.push(item);
      } catch (error) {}
    });
    return groups;
  };

  getObjidAndParentIdList = (groupTreeNodes: any) => {
    var objids: number[] = [];
    var parentIds: number[] = [];
    groupTreeNodes.map((group: any) => {
      objids.push(group.objid);
      parentIds.push(group.parentid);
    });
    return { objids, parentIds };
  };

  //updating Grafana Variables
  setVar = (objid: number, parentid: number) => {
    console.log(objid);
    if (groupsObjids.includes(objid)) {
      this.updateVar(objid, 1);
    } else {
      this.updateVar(objid, 2);
      this.updateVar(parentid, 1);
    }
  };

  // does not work since Grafana 7.0
  updateVar = (objid: number, id: number) => {
    // let vars = getTemplateSrv().getVariables()
    // let variable:any = vars[id];
    // variable.current = variable.options.find((varia:any) => varia.value === objid)
    // variable.variableSrv.updateOptions(variable).then(() => {
    //   variable.variableSrv.variableUpdated(variable, true);
    // });
  };
}
