import Q = require("q");
import * as WitService from "TFS/WorkItemTracking/Services";
import * as VSSUtilsCore from "VSS/Utils/Core";

export class BaseCalculatedField {
    /**
     * Field name input for the control
     */
    public fieldName: string;

    public formula: string;
    public requireAllFields: boolean;

    /**
     * The container to hold the control
     */
    protected containerElement: JQuery;
    private _message: JQuery;

    /**
     * The container for error message display
     */
    private _errorPane: JQuery;

    private _flushing: boolean;
    private _bodyElement: HTMLBodyElement;

    /* Inherits from initalConfig to control if always show field border
     */
    private _showFieldBorder: boolean;
    protected _formulaFields : string[];

    /**
     * Store the last recorded window width to know
     * when we have been shrunk and should resize
     */
    private _windowWidth: number;
    private _minWindowWidthDelta: number = 10; // Minum change in window width to react to
    private _windowResizeThrottleDelegate: () => void;

    constructor() {
        const initialConfig = VSS.getConfiguration();
        this._showFieldBorder = !!initialConfig.fieldBorder;

        this.containerElement = $(".container");
        if (this._showFieldBorder) {
            this.containerElement.addClass("fieldBorder");
        }

        this._errorPane = $("<div>").addClass("errorPane").appendTo(this.containerElement);
        this._message = $("<div>").addClass("message").appendTo(this.containerElement);

        const inputs: IDictionaryStringTo<string> = initialConfig.witInputs;

        this.fieldName = inputs.FieldName;
        this.requireAllFields = ("true" == inputs.RequireAllFields || "1" == inputs.RequireAllFields);
        
        if (!this.fieldName) {
            this.showError("FieldName input has not been specified");
        }

        this.formula = inputs.Formula;
        
        if (!this.formula) {
            this.showError("Formula input has not been specified");
        }

        this._windowResizeThrottleDelegate = VSSUtilsCore.throttledDelegate(this, 50, () => {
            this._windowWidth = window.innerWidth;
            this.resize();
        });

        this._windowWidth = window.innerWidth;
        $(window).resize(() => {
            if (Math.abs(this._windowWidth - window.innerWidth) > this._minWindowWidthDelta) {
                this._windowResizeThrottleDelegate.call(this);
            }
        });
    }

    public getFormulaFields(): Array<string> {
        if (this._formulaFields == undefined || this._formulaFields.length == 0) {
            this.parseFormula();
        }

        return this._formulaFields;
    }

    protected parseFormula(): void {
        this._formulaFields = new Array<string>();
        
        var fieldsRegExp = /(\[(\w|\.|-)+\])/g;
        var match;
        console.log("Parsing formula ... " + this.formula);
        while (match = fieldsRegExp.exec(this.formula)) {
            console.log("Field detected: " + match[0]);   
            var fieldName = match[0].substring(1).substring(0, match[0].length-2);
            this._formulaFields.push(fieldName);
        }
    }

    /**
     * Initialize a new instance of Control
     */
    public initialize(): void {
        this.invalidate();
    }

    /**
     * Invalidate the control's value
     */
    public invalidate(): void {
        console.log("Invalidating ...");
        if (!this._flushing) {
            //this.setMessage("getting current value");
            this._getCurrentFieldValue().then(
                (value: string) => {
                    console.log("Setting value to ..." + value);
                    //this.setMessage("Current value " + value);
                    this.setValue(value);
                },
            );
        }

        this.resize();
    }

    public clear(): void {
        // noop
    }

    public calculate(): void {
        // noop
    }

    /**
     * Flushes the control's value to the field
     */
    protected flush(): void {
        this._flushing = true;
        console.log("Flushing ...");
        WitService.WorkItemFormService.getService().then(
            (service: WitService.IWorkItemFormService) => {
                console.log("Setting value on " + this.fieldName + " to ..." + this.getValue());
                service.setFieldValue(this.fieldName, this.getValue()).then(
                    (values) => {
                        this._flushing = false;
                    },
                    () => {
                        this._flushing = false;
                        this.showError("Error storing the field value");
                    },
                );
            },
        );
    }

    protected getValue(): string {
        return "";
    }

    protected setValue(value: string): void {
        // noop
    }

    protected showError(error: string): void {
        this._errorPane.text(error);
        this._errorPane.show();
    }

    protected clearError() {
        this._errorPane.text("");
        this._errorPane.hide();
    }

    protected setMessage(message: string) {
        this._message.text(message);
    }

    private _getCurrentFieldValue(): IPromise<string> {
        const defer = Q.defer<string>();
        WitService.WorkItemFormService.getService().then(
            (service) => {
                service.getFieldValues([this.fieldName]).then(
                    (values) => {
                        defer.resolve(values[this.fieldName] as string);
                    },
                    () => {
                        this.showError("Error loading values for field: " + this.fieldName);
                    },
                );
            },
        );

        return defer.promise;
    }

    protected getFieldsValues(fields): Promise<IDictionaryStringTo<Object>> {
        return Q(WitService.WorkItemFormService.getService()).then((service) => {
            return service.getFieldValues(fields);
        })
    }


    protected resize() {
        this._bodyElement = document.getElementsByTagName("body").item(0) as HTMLBodyElement;

        // Cast as any until declarations are updated
        VSS.resize(null, this._bodyElement.offsetHeight);
    }
}
