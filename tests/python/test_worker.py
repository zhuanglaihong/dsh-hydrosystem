"""Exercise the published worker with a real installed common core."""
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]


class WorkerTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.state = Path(self.temporary.name)

    def call(self, request, cancelled=False, configured=False):
        source = os.environ['HYDROSYSTEM_TEST_SOURCE']
        cancel=self.state/'cancel'
        if cancelled:cancel.write_text('cancel')
        result = subprocess.run([
            sys.executable, os.environ.get('HYDROSYSTEM_TEST_WORKER',str(ROOT/'packages/hydrosystem-plugin/python/worker.py')),
            '--project-root', source, '--work-root', str(self.state/('project/study' if configured else 'study')),
            '--runtime-root', str(self.state/'runtime'),
            '--cancel-file',str(cancel),'--configuration-root',str(self.state/'project'),
        ]+([argument for name,file in [('hydromodel','model'),('data','data'),('torchhydro','training')]
            for argument in ['--'+name+'-config',str(self.state/'project'/(file+'.json'))]] if configured else []),
            input=json.dumps(request), capture_output=True, text=True, timeout=60)
        self.assertEqual(result.returncode, 0, result.stderr)
        return json.loads(result.stdout)

    def test_discovery_does_not_initialize_a_research(self):
        result = self.call({'action': 'discover'})
        self.assertTrue(result['ok'], result)
        names = {tool['name'] for tool in result['value']['tools']}
        self.assertIn('hydroutils_compute_metrics', names)
        self.assertNotIn('hydromodel_calibrate', names)
        self.assertFalse((self.state/'study/study.json').exists())

    def test_metrics_use_the_real_upstream_and_invalid_arguments_are_errors(self):
        result = self.call({'action': 'call', 'name': 'hydroutils_compute_metrics', 'arguments': {
            'profile': 'hydroutils.streamflow-metrics/v1',
            'observed': [1, 2, 3, 4], 'simulated': [1, 2, 3, 4],
        }})
        self.assertTrue(result['ok'], result)
        self.assertEqual(result['value']['metrics'], {'NSE': 1.0, 'KGE': 1.0, 'RMSE': 0.0})
        invalid = self.call({'action': 'call', 'name': 'capabilities', 'arguments': {'unknown': True}})
        self.assertFalse(invalid['ok'])
        self.assertEqual(invalid['error']['code'], 'INVALID_INPUT')

    def test_request_cannot_replace_the_bound_interpreter_or_study(self):
        result = self.call({'action': 'discover', 'project_root': '/somewhere-else'})
        self.assertFalse(result['ok'])
        self.assertEqual(result['error']['code'], 'INVALID_INPUT')

    def test_supported_discovery_does_not_grant_an_unconfigured_execution(self):
        result=self.call({'action':'supported'})
        self.assertTrue(result['ok'],result)
        self.assertIn('hydromodel_calibrate',{tool['name'] for tool in result['value']['tools']})
        attempted=self.call({'action':'call','name':'hydromodel_calibrate','arguments':{}})
        self.assertFalse(attempted['ok'])
        self.assertEqual(attempted['error']['code'],'DEPLOYMENT_NOT_CONFIGURED')

    def test_cancelled_project_preparation_does_not_begin_configuration(self):
        result=self.call({'action':'prepare','spec':{}},cancelled=True)
        self.assertFalse(result['ok'])
        self.assertEqual(result['error']['code'],'EXECUTION_CANCELLED')
        self.assertFalse((self.state/'project').exists())

    def test_read_artifact_checks_the_bound_study_and_content_hash(self):
        from hydrosystem.artifacts import ArtifactStore
        from hydrosystem.runtime.study import Study
        root=self.state/'study'
        Study(root).initialize(goal='Metadata inspection',new_research=True)
        expected={'algorithm':{'name':'sce_ua','settings':{'random_seed':42}}}
        ref=ArtifactStore(root).put_json(expected,schema='hydromodel.adapter.resolved/v2',kind='resolved_task')
        result=self.call({'action':'read_artifact','reference':ref})
        self.assertTrue(result['ok'],result)
        self.assertEqual(result['value']['content']['algorithm'],expected['algorithm'])
        outside={**ref,'path':'../outside.json'}
        self.assertFalse(self.call({'action':'read_artifact','reference':outside})['ok'])
        (root/ref['path']).write_text('{}')
        damaged=self.call({'action':'read_artifact','reference':ref})
        self.assertFalse(damaged['ok'])
        self.assertEqual(damaged['error']['code'],'ARTIFACT_HASH_MISMATCH')

    def test_result_status_query_uses_task_reference_and_exposes_effective_parameters(self):
        import csv
        from datetime import date,timedelta
        source=self.state/'source';(source/'attributes').mkdir(parents=True);(source/'timeseries/1D').mkdir(parents=True)
        (source/'attributes/attributes.csv').write_text('basin_id,area\n001,100\n')
        (source/'timeseries/1D_units_info.json').write_text(json.dumps({'area':'km2','precipitation':'mm/day','potential_evapotranspiration':'mm/day','streamflow':'mm/day'}))
        with (source/'timeseries/1D/001.csv').open('w',newline='') as stream:
            writer=csv.writer(stream);writer.writerow(['time','precipitation','potential_evapotranspiration','streamflow'])
            for i in range(31):writer.writerow([(date(2000,1,1)+timedelta(days=i)).isoformat(),5+i%3,1,1+i%4])
        prepared=self.call({'action':'prepare','spec':{'title':'Result inspection','source_root':str(source),'reader':'selfmade',
            'dataset_id':'fixture','basin_ids':['001'],'period':['2000-01-01','2000-01-31'],
            'calibration_period':['2000-01-01','2000-01-16'],'validation_period':['2000-01-17','2000-01-31'],'warmup_steps':0}})
        self.assertTrue(prepared['ok'],prepared)
        self.assertTrue(self.call({'action':'call','name':'hydrodata_adopt_dataset','arguments':{'dataset_id':'fixture'}},configured=True)['ok'])
        self.assertTrue(self.call({'action':'call','name':'hydrosystem_study','arguments':{'operation':'initialize','new_research':True,'goal':'Result inspection'}},configured=True)['ok'])
        result=self.call({'action':'call','name':'hydromodel_calibrate','arguments':{'profile':'hydromodel.conceptual/v2','model_id':'xaj',
            'data':{'dataset_id':'fixture','basin_id':'001','period':['2000-01-01','2000-01-16']},
            'calibration_mode':'custom','model_evaluations':64,'algorithm':{'settings':{'random_seed':42}}}},configured=True)
        self.assertTrue(result['ok'],result)
        value=result['value'];query=value['status_query']
        self.assertEqual(query,{'tool':'hydromodel_status','arguments':{'task_ref':value['task_ref']}})
        self.assertEqual(value['effective']['algorithm']['settings']['random_seed'],42)
        self.assertEqual(value['effective']['algorithm']['budget']['granted'],64)
        status=self.call({'action':'call','name':query['tool'],'arguments':query['arguments']},configured=True)
        self.assertTrue(status['ok'],status)
        self.assertEqual(status['value']['task_ref'],value['task_ref'])


if __name__ == '__main__':
    unittest.main()
