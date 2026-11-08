"""Generate clearly synthetic reader data for actual four-domain acceptance."""
import json
from pathlib import Path
import sys
import numpy as np
import pandas as pd

root=Path(sys.argv[1]).resolve()
root.mkdir(parents=True,exist_ok=False)
source=root/'synthetic-data'
(source/'attributes').mkdir(parents=True)
(source/'timeseries/1D').mkdir(parents=True)
pd.DataFrame({'basin_id':['001'],'area':[100.]}).to_csv(source/'attributes/attributes.csv',index=False)
times=pd.date_range('2000-01-01','2001-12-31');steps=np.arange(len(times))
pd.DataFrame({'time':times,'precipitation':5+4*np.sin(steps/13)**2,'potential_evapotranspiration':1+np.sin(steps/31)**2,
    'streamflow':2+np.sin(steps/9)**2}).to_csv(source/'timeseries/1D/001.csv',index=False)
(source/'timeseries/1D_units_info.json').write_text(json.dumps({'area':'km2','precipitation':'mm/day','potential_evapotranspiration':'mm/day','streamflow':'mm/day'}))
spec={'title':'Synthetic four-domain acceptance (not a real basin)','reader':'selfmade','source_root':str(source),
    'dataset_id':'synthetic','basin_ids':['001'],'period':['2000-01-01','2001-12-31'],
    'calibration_period':['2001-01-01','2001-03-01'],'validation_period':['2001-04-01','2001-05-30'],'warmup_steps':365}
(root/'project.json').write_text(json.dumps(spec,indent=2)+'\n',encoding='utf-8')
print(root/'project.json')
