import React, {PropTypes} from 'react';
import {UNIT_CENTIMETER, UNIT_FOOT, UNIT_INCH, UNIT_METER, UNIT_MILE, UNIT_MILLIMETER} from './../../constants';
import convert from 'convert-units';
import FormLabel from '../../components/style/form-label'
import FormNumberInput from '../../components/style/form-number-input'
import FormSelect from '../../components/style/form-select'


export default function PropertyLengthMeasure({value, onUpdate, configs}, {catalog}) {

  let length = value.get('length');
  let _length, _unit;

  if(value.has('_length') && value.has('_unit')){
    _length = value.get('_length');
     _unit = value.get('_unit');
  }else{
    _length = length;
    _unit = catalog.unit;
  }

  let update = (lengthInput, unitInput) => {
    let _length = parseFloat(lengthInput);

    if (isNaN(_length)) {
      _length = 0;
    }

    let length = convert(_length).from(unitInput).to(catalog.unit);
    onUpdate(value.merge({length, _length, _unit: unitInput}));
  };

  return (
    <div style={{marginBottom: "3px"}}>
      <div style={{display: "inline-block", width: "30%"}}>
        <FormLabel>{configs.label}</FormLabel>
      </div>
      <div style={{display: "inline-block", width: "45%", marginRight: "5%"}}>

        <FormNumberInput value={_length} onChange={event => update(event.target.value, _unit)}
                         min={configs.min} max={configs.max}/>
      </div>


      <div style={{display: "inline-block", width: "20%"}}>
        <FormSelect value={_unit} onChange={event => update(_length, event.target.value)}>
          <option key={UNIT_METER} value={UNIT_METER}>{UNIT_METER}</option>
          <option key={UNIT_CENTIMETER} value={UNIT_CENTIMETER}>{UNIT_CENTIMETER}</option>
          <option key={UNIT_MILLIMETER} value={UNIT_MILLIMETER}>{UNIT_MILLIMETER}</option>
          <option key={UNIT_INCH} value={UNIT_INCH}>{UNIT_INCH}</option>
          <option key={UNIT_FOOT} value={UNIT_FOOT}>{UNIT_FOOT}</option>
          <option key={UNIT_MILE} value={UNIT_MILE}>{UNIT_MILE}</option>
        </FormSelect>
      </div>

    </div>
  );

}

PropertyLengthMeasure.propTypes = {
  value: PropTypes.any.isRequired,
  onUpdate: PropTypes.func.isRequired,
  configs: PropTypes.object.isRequired
};

PropertyLengthMeasure.contextTypes = {
  catalog: PropTypes.object.isRequired
};
