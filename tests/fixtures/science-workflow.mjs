/** Actual upstream science through native tools; all inputs are synthetic. */
import assert from 'node:assert/strict';

export async function exerciseScience(call, spec) {
  const project=await call('hydrosystem_setup_project',spec);
  if(spec.reader==='selfmade') {
    const capabilities=await call('capabilities',{});
    assert.equal(capabilities.data_deployment.cache_writes,false,'CSV projects do not require native NetCDF cache preparation');
  }
  await call('hydrodata_preflight',{dataset_id:spec.dataset_id,level:'layout'});
  await call('hydrodata_adopt_dataset',{dataset_id:spec.dataset_id});
  await call('hydrosystem_study',{operation:'initialize',new_research:true,goal:spec.title});
  const selection={dataset_id:spec.dataset_id,basin_ids:spec.basin_ids,period:spec.calibration_period,
    frequency:'1D',variables:['precipitation','potential_evapotranspiration','streamflow']};
  const checked=await call('hydrodata_preflight',{profile:'hydrodatasource.daily-series/v1',selection});
  assert.equal(checked.ready,true);
  const series=await call('hydrodata_read_timeseries',{profile:'hydrodatasource.daily-series/v1',selection});
  await call('hydrodata_read_attributes',{profile:'hydrodatasource.attributes/v1',selection:{dataset_id:spec.dataset_id,basin_ids:spec.basin_ids,attribute_names:['area']}});
  const calibrationRequest={profile:'hydromodel.conceptual/v2',model_id:'xaj',
    data:{dataset_id:spec.dataset_id,basin_id:spec.basin_ids[0],period:spec.calibration_period}};
  const planned=await call('hydromodel_preflight',{operation:'calibrate',request:calibrationRequest});
  assert.equal(planned.effective.algorithm.budget.granted,256,'Default preflight and execution must use the same quick mode');
  const precise=await call('hydromodel_preflight',{operation:'calibrate',request:{...calibrationRequest,calibration_mode:'precise'}});
  assert.equal(precise.effective.algorithm.budget.granted,4096);
  const custom=await call('hydromodel_preflight',{operation:'calibrate',request:{...calibrationRequest,calibration_mode:'custom',model_evaluations:64,
    algorithm:{settings:{ngs:2,kstop:4,peps:1e-6,pcento:1e-5,random_seed:42}}}});
  assert.equal(custom.effective.algorithm.budget.granted,64);
  assert.equal(custom.effective.algorithm.settings.random_seed,42);
  assert.equal(custom.usage.actually_used,0);
  const calibration=await call('hydromodel_calibrate',calibrationRequest);
  assert.equal(calibration.usage.granted,planned.effective.algorithm.budget.granted);
  assert.ok(calibration.usage.actually_used>0);
  assert.equal(calibration.budget.limit,null);
  assert.deepEqual(calibration.status_query,{tool:'hydromodel_status',arguments:{task_ref:calibration.task_ref}});
  assert.deepEqual(calibration.effective.algorithm,planned.effective.algorithm);
  const inspected=await call(calibration.status_query.tool,calibration.status_query.arguments);
  assert.equal(inspected.task_ref,calibration.task_ref);
  const artifact=await call('hydrosystem_read_artifact',{reference:calibration.resolved_ref});
  assert.deepEqual(artifact.content.algorithm,planned.effective.algorithm);
  const validation=await call('hydromodel_simulate',{profile:'hydromodel.conceptual/v2',model_id:'xaj',
    data:{dataset_id:spec.dataset_id,basin_id:spec.basin_ids[0],period:spec.validation_period},
    data_role:'validation',parameters:{trial_ref:calibration.trial_ref}});
  assert.equal(validation.evaluation.status,'succeeded');
  const model=validation.series_selections[spec.basin_ids[0]];
  const plot=await call('hydroutils_plot_timeseries',{profile:'hydroutils.basic-plots/v1',series:[model.qobs,model.qsim]});
  assert.ok(plot.image_ref);
  const trained=await call('torchhydro_train',{profile:'torchhydro.streamflow/v1',model_id:'CpuLSTM',
    data:{dataset_id:spec.dataset_id,basin_ids:spec.basin_ids,train_period:spec.calibration_period,
      validation_period:spec.validation_period,features:['precipitation','potential_evapotranspiration'],static_attributes:['area']},
    hyperparameters:{epochs:2,hidden_size:4,lookback:7,batch_size:8,random_seed:1234}});
  assert.equal(trained.training_completed,true);
  assert.ok(trained.usage.optimizer_steps>0);
  const evaluated=await call('torchhydro_evaluate',{profile:'torchhydro.streamflow/v1',checkpoint_ref:trained.checkpoint_ref,
    period:['2001-06-01','2001-06-15']});
  assert.equal(evaluated.usage.optimizer_steps,0);
  const status=await call('hydrosystem_study',{operation:'status'});
  return {project,study:status.study,series_ref:series.timeseries_ref,mode_preflights:{quick:planned,precise,custom},calibration,validation,plot,trained,evaluated};
}
