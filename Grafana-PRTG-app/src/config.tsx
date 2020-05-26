export class PrtgConfigCtrl {
    enabled:boolean;
    appEditCtrl: any;
    appModel: any;
  
    /** @ngInject */
    constructor($scope:any, $injector:any, private $q:any) {
      this.enabled = false;
      this.appEditCtrl.setPostUpdateHook(this.postUpdate.bind(this));
    }
  
    postUpdate() {
      if (!this.appModel.enabled) {
        return this.$q.resolve();
      }
      return this.appEditCtrl.importDashboards().then(() => {
        this.enabled = true;
      });
    }
  }
