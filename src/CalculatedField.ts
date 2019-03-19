import Q = require("q");
import * as WitService from "TFS/WorkItemTracking/Services";
import * as Utils_Array from "VSS/Utils/Array";
import * as VSSUtilsCore from "VSS/Utils/Core";
import * as Utils_String from "VSS/Utils/String";
import {BaseCalculatedField} from "./BaseCalculatedField";

export class CalculatedField extends BaseCalculatedField {
    /*
    * UI elements for the control.
    */
    private _chevron: JQuery;

    private _maxSelectedToShow = 100;
    private _windowFocussed = false;
    
    private calculatedValue = "0";

    private _toggleThrottleDelegate: () => void;
    /**
     * Initialize a new instance of MultiValueControl
     */
    public initialize(): void {
        this._chevron = $("<span />").addClass("bowtie-icon bowtie-navigate-refresh"); //.appendTo(this.containerElement);
    
        this.setMessage("Calculating ...");

        this.calculate();

        //this._populateCheckBoxes();
        console.log("parent intializing");
        super.initialize();

        this._toggleThrottleDelegate = VSSUtilsCore.throttledDelegate(this, 100, () => {
            this.calculate();
        });

        $(window).blur(() => {
            return false;
        });

        $(window).focus((e) => {
            this._windowFocussed = true;
            setTimeout(() => {
                this._windowFocussed = false;
            }, 500);
            this._toggleThrottleDelegate.call(this);
            return false;
        });

        this._chevron.click(() => {
            this._toggleThrottleDelegate.call(this);
            return false;
        });
    }

    public calculate(): void {
        var fields = this.getFormulaFields() as Array<string>;
        
        this.getFieldsValues(
            this.getFormulaFields()
        ).then(
            (values: IDictionaryStringTo<Object>) => {
              //  var using = "";
                var finalScore = 0;
                var formula = this.formula;
                var missingFields = [];

                for(var key in values) {
                    if (values[key] != null && values[key] != "") {
                        var value = parseFloat(values[key].toString());
                    
                        if (!isNaN(value)) {
                            formula = formula.replace("[" + key + "]", value.toString());
                        }
                    } else {
                        if (this.requireAllFields) {
                            missingFields.push(key);
                        }
                    }
                }

                console.log("Eval: " + formula, missingFields);

                if (missingFields.length > 0 ) { 
                    this.setValue("");
                    this.setMessage("Required fields missing: " + missingFields.join(', '));
                    this.resize();
                    this.flush();
                } else {
                    finalScore = eval(formula);
                    var roundedScore = Math.round(finalScore * 100) / 100; // Round to two
                    this.setMessage(roundedScore.toLocaleString());
                    this.setValue(roundedScore.toLocaleString());
                    this.resize();
                    this.flush();
                }
            },
        );
    }

    public clear(): void {
        // noop
    }

    protected getValue(): string {
        return this.calculatedValue;
    }

    protected setValue(value: string): void {
        this.calculatedValue = value;
    }
}