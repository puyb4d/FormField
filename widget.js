WAF.define('FormField', ['waf-core/widget', 'Label'], function(widget, Label) {
    "use strict";

    var TEXT_INPUT = { kind: 'TextInput', property: 'value' };
    var DEFAULT_WIDGETS = {
        'string': TEXT_INPUT,
        'long':   TEXT_INPUT,
        'number': TEXT_INPUT,
        'float':  TEXT_INPUT,
        'byte':   TEXT_INPUT,
        'word':   TEXT_INPUT,
        'long64': TEXT_INPUT,
        //'date':
        //'object':
        'relatedEntity': { kind: 'DropDown', property: 'value', options: { 'items-attribute-label': 'ID', allowempty: true } },
        'bool':         { kind: 'CheckBox', property: 'value' }
    };

    var getType = function(attribute) {
        if(attribute.kind !== 'storage') {
            return attribute.kind;
        }
        return attribute.type;
    };

    var FormField = widget.create('FormField', {
        datasource: widget.property({ type: 'datasource' }),
        attribute: widget.property({ type: 'attribute', datasourceProperty: 'datasource' }),
        title: widget.property({ type: 'string' }),
        widget: widget.property({ type: 'string' }),
        property: widget.property({ type: 'string' }),
        init: function() {
            this.subscribe('datasourceBindingChange', 'datasource', function(event) {
                this._updateWidget();
            }, this);
            this.attribute.onChange(this._updateWidget);
            this.title.onChange(this._updateWidget);
            this.widget.onChange(this._updateWidget);
            this.property.onChange(this._updateWidget);
            this._updateWidget();
        },
        _updateWidget: function() {
            if(!this.attribute()) {
                return;
            }
            var dataClass = this.datasource.getDataClass();
            if(!(this.attribute() in dataClass)) {
                return;
            }
            // determine the widget class
            var kind = this.widget();
            var property = this.property();
            if(!kind) {
                var defaultWidget = DEFAULT_WIDGETS[getType(dataClass[this.attribute()])];
                kind = defaultWidget.kind;
                property = defaultWidget.property;
            }
            var widget = this.getPart('widget');
            if (!widget || widget.kind !== kind) {
                var klass = WAF.require(kind);
                widget = new klass();
                this.setPart('widget', widget);
            }
            var bound = widget[property].boundDatasource();
            var fieldBound = this.datasource.boundDatasource();
            if(!fieldBound) {
                return;
            }
            if(!bound || bound.datasourceName !== fieldBound.datasourceName || bound.attribute !== this.attribute()) {
                widget[property].bindDatasource({
                    datasource: fieldBound.datasourceName,
                    attribute: this.attribute()
                });
                bound = widget[property].boundDatasource();
            }

            var label = this.title();
            if(!label) {
                label = bound.attribute.split('.').pop();
            }
            this.getPart('label').value(label);
            this.getPart('label').setWidget(widget);
        },
        getQueryAndParams: function(query, params) {
            // Note: query and params are passed by reference and directly modifyed
            var dataClass = this.datasource.getDataClass();
            var value = null;
            var property = this.property();
            if(!this.widget() || !this.property()) {
                var defaultWidget = DEFAULT_WIDGETS[getType(dataClass[this.attribute()])];
                property = defaultWidget.property;
            }
            if(!this.getPart('widget')) {
                return;
            }
            value = this.getPart('widget')[property]();
            if(value != null) {
                switch(getType(dataClass[this.attribute()])) {
                    case 'string':
                        params.push(value);
                        query.push(this.attribute() + ' begin :' + params.length);
                        break;
                    case 'relatedEntity':
                        var key;
                        if(dataClass instanceof WAF.DataClass) {
                            key = dataClass._private.primaryKey;
                        } else {
                            for(var k in dataClass) {
                                if(dataClass[k].isKey) {
                                    key = k;
                                }
                            }
                        }
                        if(key) {
                            params.push(value);
                            query.push(this.attribute() + '.' + key + ' = :' + params.length);
                        }
                        break;
                    default:
                        params.push(value);
                        query.push(this.attribute() + ' = :' + params.length);
                }
            }
        }
    });
    FormField.inherit('waf-behavior/layout/composed');
    FormField.setPart('label',    Label);
    FormField.setPart('widget');

    return FormField;

});
