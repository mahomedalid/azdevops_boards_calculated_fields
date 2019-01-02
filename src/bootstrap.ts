import * as WitExtensionContracts from "TFS/WorkItemTracking/ExtensionContracts";
import { WorkItemFormService } from "TFS/WorkItemTracking/Services";
import {BaseCalculatedField} from "./BaseCalculatedField";
import {CalculatedField} from "./CalculatedField";

// save on ctr + s
$(window).bind("keydown", (event: JQueryEventObject) => {
    if (event.ctrlKey || event.metaKey) {
        if (String.fromCharCode(event.which) === "S") {
            event.preventDefault();
            WorkItemFormService.getService().then((service) => service.beginSaveWorkItem($.noop, $.noop));
        }
    }
});

let control: BaseCalculatedField;

const provider = (): Partial<WitExtensionContracts.IWorkItemNotificationListener> => {
    const ensureControl = () => {
        if (!control) {
            control = new CalculatedField();
            control.initialize();
        }

        control.invalidate();
    };

    return {
        onLoaded: (args: WitExtensionContracts.IWorkItemLoadedArgs) => {
            ensureControl();
        },
        onUnloaded: (args: WitExtensionContracts.IWorkItemChangedArgs) => {
            if (control) {
                control.clear();
            }
        },
        onFieldChanged: (args: WitExtensionContracts.IWorkItemFieldChangedArgs) => {
            var fields = control.getFormulaFields();
            
            if (!control) {
                return;
            }

            for(var i = 0; i < fields.length; i++) {
                if (   args.changedFields[fields[i]] !== undefined 
                    && args.changedFields[fields[i]] !== undefined 
                ) {
                    control.calculate();
                }
            }
        },
    };
};

VSS.register(VSS.getContribution().id, provider);
