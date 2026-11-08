/** Hydrology workbench, mounted in the Desktop's existing panel slots. */
window.__ModuleLoader__.load({
  id: '@iheadwater/dsh-hydrosystem',
  factory(require) {
    const React = require('react'), h = React.createElement
    const zh = {
      panel: '水文工作台', subtitle: 'HYDROSYSTEM · RESEARCH DEMO', title: '让水文研究，形成完整闭环',
      intro: '用自然语言连接数据、模型与结果。每一次计算，都留下可追溯的研究证据。',
      chat: '与水文研究员对话', refresh: '刷新研究结果', loading: '正在读取研究记录…',
      overview: '研究概览', tasks: '任务记录', figures: '图表与证据',
      demo: '合成数据演示 · demo_selfmade · 非真实流域研究结论',
      data: '数据处理', model: '模型率定', train: '深度学习', evaluate: '绘图与评估',
      dataDesc: '读取、检查与准备流域数据', modelDesc: 'XAJ / GR4J 与参数搜索',
      trainDesc: 'CPU LSTM 训练与独立验证', evaluateDesc: '过程线、散点图与性能指标',
      research: '当前研究', empty: '尚无研究记录。与水文研究员对话，明确研究目标后开始。',
      recent: '最近的科学任务', completed: '已完成活动', imageCount: '已验证图表',
      updated: '读取时间', operation: '操作', state: '状态', time: '时间', evidence: '查看结果与引用',
      succeeded: '执行完成', failed: '失败', running: '记录为运行中', cancelled: '已取消',
      calibration: 'XAJ 率定目标 NSE', validation: 'XAJ 验证 NSE',
      stop: '达到调用次数上限；不代表收敛', noMetric: '尚无对应结果', noFigures: '尚无绘图结果',
      warn: '部分证据未能读取', retry: '重试', details: '研究信息', figure: '研究图表',
      bounds: '演示配置：单次率定最多 256 次模型调用 / 900 秒；训练最多 2 epoch / 180 秒。正式模式待完善。',
      inspect: '查看当前研究进展', inspectPrompt: '请读取当前 Study 和工作台，简要汇报已有的数据处理、模型率定、深度学习和绘图结果，区分验证效果与执行成功，说明率定停止原因。不要重新运行计算。',
      results: '研究成果', trials: '任务与试验', fixedStudy: '演示模式 · 当前节点共享同一研究',
      back: '返回列表', parameters: '参数与产物引用', provenance: '参数、结果与来源',
      autoUpdate: '任务结束后自动更新', noResults: '尚无研究成果；与 Agent 对话发起研究后，这里会显示结果',
      calibrationReport: '模型率定报告', validationReport: '模拟与评估报告', trainingReport: '深度学习训练报告', evaluationReport: '深度学习评估报告',
      timeseries: '径流过程线', rainfallRunoff: '降雨—径流过程图', scatter: '实测与模拟散点图',
      basin: '流域', period: '时段', task: '任务', trial: '试验', stopReason: '停止原因',
      goalValue: '率定目标', usage: '实际用量', units: '单位', reports: '研究报告',
      viewTasks: '查看任务与试验', viewResults: '查看研究成果', showDetails: '展开原始证据',
      studies: '研究实例', environments: '环境与节点', files: '文件', artifacts: '产物', experiments: '实验', terminal: '终端',
      selectedStudy: '当前选择', selectStudy: '选择此研究', newStudy: '新建研究', goalLabel: '研究目标',
      studyHelp: '选择研究后从此页面开始新对话；已有对话保留各自的研究绑定',
      newStudyHelp: '明确创建一项独立研究；只初始化记录，不启动计算',
      environmentHelp: '实际解释器、五包版本与来源；本页刷新只查询，不安装或升级',
      metadataOnly: '元数据检查：不代表科学闭环或 GPU 可用性验收',
      package: '包', installedVersion: '实际版本', expectedVersion: '发布要求',
      node: '本机执行节点', python: 'Python', virtualEnvironment: '虚拟环境', uvPath: 'uv 程序',
      runtime: '执行域', lockDigest: '发布锁 SHA-256', activeJobs: '节点运行任务',
      noActiveJobs: '当前节点没有运行中的科学任务', allArtifacts: '参数与模型产物',
      boundStudy: '此对话绑定的研究', openChat: '在此研究中新建对话',
      commandUnavailable: '研究或环境插件尚未就绪，请检查插件状态；更新插件后需重开桌面应用',
      workspace: '工作区', chooseWorkspace: '请选择工作区', workspaceRequired: '请在研究实例页面选择工作区，再新建对话',
    }
    const en = { ...zh, panel: 'Hydrology workbench', subtitle: 'HYDROSYSTEM · RESEARCH DEMO',
      title: 'Connect your hydrology research', intro: 'Data, models and traceable evidence in one research workflow.',
      chat: 'Talk to the hydrologist', refresh: 'Refresh results', loading: 'Reading research records…',
      overview: 'Overview', tasks: 'Tasks', figures: 'Figures and evidence', demo: 'Synthetic demo data · demo_selfmade · Not real basin findings',
      data: 'Data', model: 'Calibration', train: 'Deep learning', evaluate: 'Evaluation',
      dataDesc: 'Read and prepare basin data', modelDesc: 'XAJ / GR4J parameter search', trainDesc: 'CPU LSTM training and validation', evaluateDesc: 'Hydrographs, scatter plots and metrics',
      research: 'Current study', empty: 'No study yet. Discuss a research goal with the hydrologist to begin.',
      recent: 'Recent scientific tasks', completed: 'Completed activities', imageCount: 'Verified figures', updated: 'Read at',
      operation: 'Operation', state: 'Status', time: 'Time', evidence: 'Results and references',
      succeeded: 'Completed', failed: 'Failed', running: 'Recorded as running', cancelled: 'Cancelled',
      calibration: 'XAJ calibration NSE', validation: 'XAJ validation NSE', stop: 'Evaluation limit reached; convergence is not established',
      noMetric: 'No result yet', noFigures: 'No figures yet', warn: 'Some evidence could not be read', retry: 'Retry', details: 'Study information', figure: 'Research figure',
      bounds: 'Demo limits: 256 evaluations / 900 seconds per calibration; 2 epochs / 180 seconds per training. Production modes are pending.',
      inspect: 'Review this study', inspectPrompt: 'Read the current Study and workbench and briefly report existing data, calibration, deep-learning and plotting results. Distinguish execution success from validation performance. Report termination reasons. Do not run new computations.',
      results: 'Research outputs', trials: 'Tasks and trials', fixedStudy: 'Demo · This node shares one study',
      back: 'Back to list', parameters: 'Parameters and artifact references', provenance: 'Inputs, outputs and sources',
      autoUpdate: 'Updates when tasks finish', noResults: 'No outputs yet. Ask the agent to start research.',
      calibrationReport: 'Calibration report', validationReport: 'Simulation and evaluation report', trainingReport: 'Training report', evaluationReport: 'Deep-learning evaluation report',
      timeseries: 'Hydrograph', rainfallRunoff: 'Rainfall–runoff plot', scatter: 'Observed vs simulated scatter',
      basin: 'Basin', period: 'Period', task: 'Task', trial: 'Trial', stopReason: 'Termination',
      goalValue: 'Objective', usage: 'Actual usage', units: 'Units', reports: 'Research reports',
      viewTasks: 'View tasks and trials', viewResults: 'View outputs', showDetails: 'Expand raw evidence',
      studies: 'Studies', environments: 'Environment and node', files: 'Files', artifacts: 'Artifacts', experiments: 'Experiments', terminal: 'Terminal',
      selectedStudy: 'Selected study', selectStudy: 'Select study', newStudy: 'Create study', goalLabel: 'Research goal',
      studyHelp: 'Start a new conversation here after selecting a study. Existing conversations retain their own binding.',
      newStudyHelp: 'Explicitly create independent research records without starting computation.',
      environmentHelp: 'Actual interpreter, package versions and sources. Refresh queries metadata without installing or upgrading.',
      metadataOnly: 'Metadata check; scientific execution and GPU availability are not verified by this query.',
      package: 'Package', installedVersion: 'Installed', expectedVersion: 'Required', node: 'Local execution node',
      python: 'Python', virtualEnvironment: 'Virtual environment', uvPath: 'uv executable', runtime: 'Execution root',
      lockDigest: 'Lock SHA-256', activeJobs: 'Active node tasks', noActiveJobs: 'No scientific tasks are running on this node',
      allArtifacts: 'Parameters and model artifacts', boundStudy: 'Study bound to this conversation', openChat: 'New conversation in this study',
      commandUnavailable: 'Research or environment plugins are unavailable. Check plugin status and reopen Desktop after updating.',
      workspace: 'Workspace', chooseWorkspace: 'Select a workspace', workspaceRequired: 'Select a workspace on the Studies page before opening a conversation.',
    }
    const css = `
      .hydro-page{height:100%;overflow:auto;color:var(--dsw-alias-label-primary);padding:32px clamp(24px,4vw,48px) 48px;box-sizing:border-box;font-size:13px}
      .hydro-inner{max-width:1100px;margin:auto}.hydro-page *{box-sizing:border-box}
      .hydro-kicker{font-size:11px;letter-spacing:2px;color:var(--dsw-alias-label-secondary)}
      .hydro-page h1{font-size:28px;font-weight:500;line-height:1.4;margin:14px 0 10px}.hydro-page h2{font-size:17px;font-weight:500;margin:0 0 16px}
      .hydro-muted{color:var(--dsw-alias-label-secondary);line-height:1.7}.hydro-actions{display:flex;gap:10px;flex-wrap:wrap;margin:22px 0}
      .hydro-page button{font:inherit;color:inherit;border:1px solid var(--dsw-alias-border-l3);border-radius:8px;background:transparent;padding:9px 14px;cursor:pointer}
      .hydro-page button:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:3px}
      .hydro-page button:disabled{opacity:.5;cursor:wait}.hydro-page button.hydro-primary{background:var(--dsw-alias-brand-primary);color:var(--dsw-alias-button-primary-label,#fff);border-color:transparent}
      .hydro-flow,.hydro-metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:24px 0}
      .hydro-card{border:1px solid var(--dsw-alias-border-l3);border-radius:12px;padding:18px;min-width:0}
      .hydro-flow strong{font-size:14px;font-weight:500;display:block;margin:10px 0 6px}.hydro-step{font-size:11px;color:var(--dsw-alias-brand-primary);letter-spacing:1px}
      .hydro-tabs{display:flex;gap:22px;border-bottom:1px solid var(--dsw-alias-border-l3);margin:28px 0 22px}
      .hydro-tabs button{border:0;border-radius:0;padding:10px 0 14px;border-bottom:2px solid transparent}
      .hydro-tabs button[aria-selected=true]{color:var(--dsw-alias-brand-primary);border-bottom-color:currentColor}
      .hydro-stat{font-size:27px;font-weight:500;margin:12px 0 6px}.hydro-ref{font-family:monospace;font-size:11px;overflow-wrap:anywhere}
      .hydro-notice{padding:12px 16px;border:1px solid var(--dsw-alias-border-l3);border-radius:8px;line-height:1.6;margin:14px 0}
      .hydro-table{width:100%;border-collapse:collapse;table-layout:fixed}.hydro-table th{text-align:left;font-weight:500;color:var(--dsw-alias-label-secondary)}
      .hydro-table td,.hydro-table th{padding:13px 8px;border-bottom:1px solid var(--dsw-alias-border-l3);vertical-align:top;overflow-wrap:anywhere}
      .hydro-page summary{cursor:pointer;padding:8px 0}.hydro-page pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:11px;max-height:380px;overflow:auto}
      .hydro-gallery{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.hydro-gallery figure{margin:0}.hydro-gallery img{width:100%;height:auto;background:white;border-radius:6px}.hydro-gallery figcaption{padding-top:10px;overflow-wrap:anywhere}
      @media(max-width:900px){.hydro-flow,.hydro-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.hydro-gallery{grid-template-columns:1fr}.hydro-page h1{font-size:24px}}
      @media(max-width:520px){.hydro-flow{grid-template-columns:1fr}.hydro-page{padding:24px 20px}.hydro-tabs{gap:15px}}
    `
    function Icon() { return h('span', { style: { fontSize: 22, lineHeight: 1 }, 'aria-hidden': true }, '≋') }
    const paneCss = `
      .hydro-pane{height:100%;overflow:auto;padding:20px;color:var(--dsw-alias-label-primary);font-size:13px;box-sizing:border-box;container-type:inline-size}
      .hydro-pane *{box-sizing:border-box}.hydro-pane h2{font-size:17px;font-weight:500;margin:0 0 12px}.hydro-pane h3{font-size:14px;font-weight:500;margin:0 0 10px}
      .hydro-pane button,.hydro-header-button{font:inherit;color:var(--dsw-alias-label-primary);background:transparent;border:1px solid var(--dsw-alias-border-l3);border-radius:8px;padding:7px 10px;cursor:pointer}
      .hydro-pane button:focus-visible,.hydro-header-button:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}
      .hydro-pane button:disabled{opacity:.5;cursor:wait}.hydro-pane .hydro-card{padding:14px;margin:12px 0;border:1px solid var(--dsw-alias-border-l3);border-radius:10px;overflow-wrap:anywhere}
      .hydro-pane .hydro-muted{color:var(--dsw-alias-label-secondary);line-height:1.6}.hydro-pane .hydro-ref{font-family:monospace;font-size:11px;overflow-wrap:anywhere}
      .hydro-pane .hydro-bar{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:10px}
      .hydro-pane .hydro-notice{border:1px solid var(--dsw-alias-border-l3);border-radius:8px;padding:10px;margin:12px 0;overflow-wrap:anywhere}
      .hydro-pane .hydro-thumb{display:block;width:100%;height:auto;border-radius:6px;background:var(--dsw-alias-background-primary)}
      .hydro-pane .hydro-figure-button{display:block;width:100%;text-align:start;padding:12px;margin:12px 0}
      .hydro-pane .hydro-metric-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(85px,1fr));gap:8px;margin:12px 0}
      .hydro-pane .hydro-metric{padding:10px;border:1px solid var(--dsw-alias-border-l3);border-radius:8px}
      .hydro-pane .hydro-value{font-size:21px;font-weight:500;display:block;margin:5px 0}.hydro-pane pre{font-size:11px;white-space:pre-wrap;overflow-wrap:anywhere;max-height:320px;overflow:auto}
      .hydro-pane summary{cursor:pointer;padding:8px 0}.hydro-pane dl{margin:12px 0}.hydro-pane dt{color:var(--dsw-alias-label-secondary);margin-top:10px}.hydro-pane dd{margin:4px 0;overflow-wrap:anywhere}
      .hydro-header-button{font-size:12px;padding:5px 9px;white-space:nowrap}
    `
    function ResearchPane({ useTabInfo, load, watch, mode, storageKey, t }) {
      const { tab } = useTabInfo()
      const [view, setView] = React.useState(null), [busy, setBusy] = React.useState(false)
      const restored = React.useMemo(() => { try { return JSON.parse(localStorage.getItem(storageKey) ?? '{}') } catch { return {} } }, [storageKey])
      const [error, setError] = React.useState(''), [selected, setSelected] = React.useState(restored.selected ?? null)
      const [category, setCategory] = React.useState(restored.category === 'figures' ? 'figures' : 'reports')
      React.useEffect(() => { try { localStorage.setItem(storageKey, JSON.stringify({ selected, category })) } catch { /* Preview remains usable without local storage. */ } }, [storageKey, selected, category])
      const live = React.useRef(true), running = React.useRef(false), dirty = React.useRef(false)
      async function refresh() {
        if (running.current) { dirty.current = true; return }
        running.current = true; setBusy(true)
        try { const value = await load(); if (live.current) { setView(value); setError('') } }
        catch (failure) { if (live.current) setError(failure.message) }
        finally {
          running.current = false
          if (live.current) {
            setBusy(false)
            if (dirty.current) { dirty.current = false; void refresh() }
          }
        }
      }
      React.useEffect(() => { live.current = true; return () => { live.current = false } }, [])
      React.useEffect(() => {
        if (!tab.visible) return
        void refresh()
        return watch(refresh)
      }, [tab.visible, watch])
      React.useEffect(() => tab.actions.bindCommands({ refresh }), [tab.actions])
      React.useEffect(() => {
        if (!tab.visible || !view?.runtime?.active?.length || busy) return
        const timer = setTimeout(() => { void refresh() }, 5000)
        return () => clearTimeout(timer)
      }, [tab.visible, view, busy])
      const list = view?.activities ?? []
      const reports = list.filter(a => ['hydromodel.calibrate', 'hydromodel.simulate', 'torchhydro.train', 'torchhydro.evaluate'].includes(a.operation) && a.result)
      const names = { 'hydromodel.calibrate': 'calibrationReport', 'hydromodel.simulate': 'validationReport', 'torchhydro.train': 'trainingReport', 'torchhydro.evaluate': 'evaluationReport',
        hydroutils_plot_timeseries: 'timeseries', hydroutils_plot_rainfall_runoff: 'rainfallRunoff', hydroutils_plot_scatter: 'scatter' }
      const title = item => (item.result?.model_id ? item.result.model_id.toUpperCase() + ' · ' : '') + (names[item.operation] ? t(names[item.operation]) : item.operation)
      const selectedActivity = selected && list.find(a => a.activity_ref === selected)
      const image = selected && view?.images.find(a => a.activity_ref === selected)
      const result = selectedActivity?.result
      const number = value => typeof value === 'number' && Number.isFinite(value) ? value.toFixed(3) : '—'
      const metrics = evaluation => {
        if (!evaluation?.metrics) return null
        return h('div', { className: 'hydro-metric-grid' }, ...Object.entries(evaluation.metrics).map(([name, value]) =>
          h('div', { className: 'hydro-metric', key: name }, name, h('span', { className: 'hydro-value' }, number(typeof value === 'number' ? value : value?.value)),
            h('small', { className: 'hydro-muted' }, evaluation.metric_units?.[name] ?? evaluation.metric_details?.[name]?.unit ?? (name === 'RMSE' ? evaluation.flow_unit : 'dimensionless')))))
      }
      const status = value => ['succeeded', 'failed', 'running', 'cancelled'].includes(value) ? t(value) : value
      const source = activity => h('details', null, h('summary', null, t('showDetails')), h('pre', null, JSON.stringify(activity, null, 2)))
      const go = next => { setSelected(null); tab.actions.openTab(next === 'tasks' ? 'hydro-tasks' : 'hydro-results') }
      return h('section', { className: 'hydro-pane', 'aria-busy': busy }, h('style', null, paneCss),
        h('div', { className: 'hydro-bar' }, h('h2', null, t(mode === 'tasks' ? 'trials' : 'results')),
          h('button', { onClick: refresh, disabled: busy }, t('refresh'))),
        h('div', { className: 'hydro-muted' }, t('boundStudy'), ' · ', view?.study?.goal ?? t('empty')),
        h('div', { className: 'hydro-muted' }, t('autoUpdate')),
        h('div', { className: 'hydro-bar', style: { marginTop: 12 } }, h('button', { onClick: () => go(mode === 'tasks' ? 'results' : 'tasks') }, t(mode === 'tasks' ? 'viewResults' : 'viewTasks'))),
        error && h('div', { role: 'alert', className: 'hydro-notice' }, error, ' ', h('button', { onClick: refresh }, t('retry'))),
        busy && !view && h('div', { role: 'status', className: 'hydro-muted' }, t('loading')),
        view && h(React.Fragment, null,
          h('div', { className: 'hydro-muted' }, t('updated'), ' · ', new Date(view.updated_at).toLocaleTimeString()),
          view.study && h('details', { className: 'hydro-card' }, h('summary', null, view.study.goal), h('div', { className: 'hydro-ref' }, view.study.study_ref)),
          view.warnings.length > 0 && h('details', { className: 'hydro-notice' }, h('summary', null, t('warn')), h('pre', null, view.warnings.join('\n'))),
          selectedActivity ? h('article', null,
            h('button', { onClick: () => setSelected(null) }, '← ', t('back')),
            h('h3', { style: { marginTop: 18 } }, title(selectedActivity)),
            image && h('a', { href: image.src, download: image.reference.content_hash + '.png' }, h('img', { className: 'hydro-thumb', src: image.src, alt: title(selectedActivity) })),
            result?.objective && h('div', { className: 'hydro-card' }, t('goalValue'), ' · ', result.objective.name,
              h('span', { className: 'hydro-value' }, number(result.objective.value))),
            metrics(result?.evaluation),
            ...Object.entries(result?.evaluation?.basin_metrics ?? {}).map(([basin, values]) => h('section', { key: basin }, h('h3', null, t('basin'), ' ', basin), metrics({ ...values, flow_unit: result.evaluation.flow_unit }))),
            result?.stop_reason && h('p', { className: 'hydro-notice' }, result.stop_reason === 'budget_exhausted' ? t('stop') : result.stop_reason),
            h('dl', null, ...[
              ['state', status(selectedActivity.status)], ['basin', result?.data?.basin_id ?? result?.resolved?.data?.basin_ids?.join(', ')],
              ['period', (result?.data?.period ?? result?.evaluation?.period)?.join(' → ')],
              ['trial', result?.trial_ref], ['task', result?.task_ref],
            ].filter(([, value]) => value).flatMap(([key, value]) => [h('dt', { key: key + 'dt' }, t(key)), h('dd', { key: key + 'dd', className: key === 'task' ? 'hydro-ref' : '' }, value)])),
            result?.usage && h('details', null, h('summary', null, t('usage')), h('pre', null, JSON.stringify(result.usage, null, 2))),
            source(selectedActivity))
          : mode === 'tasks' ? h('div', null,
            h('h3', null, t('activeJobs')),
            view.runtime?.active?.length ? h('pre', null, JSON.stringify(view.runtime.active, null, 2)) : h('p', { className: 'hydro-muted' }, t('noActiveJobs')),
            ...list.map(activity => h('article', { key: activity.activity_ref, className: 'hydro-card' },
            h('h3', null, title(activity)), h('div', { className: 'hydro-muted' }, status(activity.status), ' · ', new Date(activity.created_at).toLocaleString()),
            activity.result?.task_ref && h('div', { className: 'hydro-ref', style: { margin: '8px 0' } }, activity.result.task_ref),
            h('button', { onClick: () => setSelected(activity.activity_ref) }, t('evidence')))))
          : h(React.Fragment, null,
            h('div', { className: 'hydro-bar', style: { marginTop: 12 } },
              h('button', { 'aria-pressed': category === 'reports', onClick: () => setCategory('reports') }, t('reports'), ' ', reports.length),
              h('button', { 'aria-pressed': category === 'figures', onClick: () => setCategory('figures') }, t('figures'), ' ', view.counts.figures)),
            !reports.length && !view.images.length && h('p', { className: 'hydro-notice' }, t('noResults')),
            ...(category === 'reports' ? reports : []).map(activity => h('article', { className: 'hydro-card', key: activity.activity_ref },
              h('h3', null, title(activity)), h('div', { className: 'hydro-muted' }, status(activity.status)),
              metrics(activity.result?.evaluation),
              activity.result?.objective && h('p', null, activity.result.objective.name, ' ', number(activity.result.objective.value)),
              activity.result?.stop_reason === 'budget_exhausted' && h('p', { className: 'hydro-muted' }, t('stop')),
              h('button', { onClick: () => setSelected(activity.activity_ref) }, t('evidence')))),
            category === 'reports' && view.artifacts?.length > 0 && h('section', { className: 'hydro-card' }, h('h3', null, t('allArtifacts')),
              ...view.artifacts.map(item => h('details', { key: item.reference.artifact_id },
                h('summary', null, item.reference.kind ?? item.operation),
                h('div', { className: 'hydro-ref' }, item.reference.artifact_id),
                h('button', { onClick: () => setSelected(item.activity_ref) }, t('evidence')),
                h('pre', null, JSON.stringify(item.reference, null, 2))))),
            ...(category === 'figures' ? view.images : []).map(item => h('button', { className: 'hydro-figure-button', key: item.reference.content_hash, onClick: () => setSelected(item.activity_ref) },
              h('h3', null, title(item)), h('img', { className: 'hydro-thumb', src: item.src, alt: title(item), loading: 'lazy' }))))))
    }
    function ResearchHeader({ open, t }) {
      const [error, setError] = React.useState('')
      return h(React.Fragment, null, h('style', null, paneCss),
        h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end' } },
          ...[['files', 'files'], ['artifacts', 'hydro-results'], ['experiments', 'hydro-tasks'], ['terminal', 'terminal']].map(([label, kind]) =>
            h('button', { key: kind, className: 'hydro-header-button', onClick: () => {
              try { open(kind); setError('') } catch (failure) { setError(failure.message) }
            } }, t(label)))), error && h('span', { role: 'alert' }, error))
    }
    function ManagementPage({ mode, query, openChat, workspaceSource, t }) {
      const source = React.useMemo(() => ({ subscribe: listener => workspaceSource.subscribe(listener),
        getSnapshot: () => workspaceSource.getSnapshot() }), [workspaceSource])
      const workspaces = React.useSyncExternalStore(source.subscribe, source.getSnapshot).items
      const [workspaceId, setWorkspaceId] = React.useState(workspaces.length === 1 ? workspaces[0].workspaceId : '')
      const [snapshot, setSnapshot] = React.useState(null), [error, setError] = React.useState('')
      const [busy, setBusy] = React.useState(false), [goal, setGoal] = React.useState('')
      const view = snapshot?.mode === mode ? snapshot.value : null
      const alive = React.useRef(true), revision = React.useRef(0)
      async function run(request) {
        const id = ++revision.current
        setBusy(true)
        try {
          const value = await query(request)
          if (alive.current && id === revision.current) { setSnapshot({ mode, value }); setError(''); if (request?.action === 'create') setGoal('') }
        } catch (failure) { if (alive.current && id === revision.current) setError(failure.message) }
        finally { if (alive.current && id === revision.current) setBusy(false) }
      }
      React.useEffect(() => { alive.current = true; setSnapshot(null); setError(''); void run(); return () => { alive.current = false; ++revision.current } }, [mode])
      const detail = (label, value) => h(React.Fragment, { key: label }, h('dt', { className: 'hydro-muted' }, t(label)), h('dd', { className: 'hydro-ref', style: { margin: '6px 0 16px', overflowWrap: 'anywhere' } }, value))
      return h('main', { className: 'hydro-page', 'aria-busy': busy }, h('style', null, css), h('div', { className: 'hydro-inner' },
        h('h1', null, t(mode)), h('p', { className: 'hydro-muted' }, t(mode === 'studies' ? 'studyHelp' : 'environmentHelp')),
        mode === 'studies' && h('label', null, t('workspace'), ' ', h('select', { value: workspaceId, onChange: event => setWorkspaceId(event.target.value),
          style: { font: 'inherit', padding: 8, borderRadius: 8, color: 'inherit', background: 'var(--dsw-alias-background-primary)', border: '1px solid var(--dsw-alias-border-l3)' } },
          h('option', { value: '' }, t('chooseWorkspace')), ...workspaces.map(item => h('option', { key: item.workspaceId, value: item.workspaceId }, item.title || item.path)))),
        h('div', { className: 'hydro-actions' }, h('button', { disabled: busy, onClick: () => { void run() } }, t('refresh')),
          mode === 'studies' && h('button', { disabled: busy || !view || !workspaceId, onClick: () => { void openChat(undefined, workspaceId).catch(failure => setError(failure.message)) } }, t('openChat'))),
        error && h('div', { role: 'alert', className: 'hydro-notice' }, error),
        busy && !view && h('p', { role: 'status' }, t('loading')),
        mode === 'studies' && view && h(React.Fragment, null,
          ...view.studies.map(study => h('article', { className: 'hydro-card', key: study.id, style: { marginBottom: 12 } },
            h('h2', null, study.goal), h('p', { className: 'hydro-ref hydro-muted' }, study.study_ref),
            h('p', { className: 'hydro-muted' }, study.created_at ? new Date(study.created_at).toLocaleString() : '—'),
            h('button', { disabled: busy || study.id === view.selected, onClick: () => { void run({ action: 'select', id: study.id }) } }, t(study.id === view.selected ? 'selectedStudy' : 'selectStudy')))),
          ...view.warnings.map((message, index) => h('p', { role: 'alert', key: index }, message)),
          h('section', { className: 'hydro-card' }, h('h2', null, t('newStudy')), h('p', { className: 'hydro-muted' }, t('newStudyHelp')),
            h('form', { onSubmit: event => { event.preventDefault(); void run({ action: 'create', goal: goal.trim() }) } },
              h('label', null, t('goalLabel'), h('textarea', { value: goal, maxLength: 2000, required: true,
                style: { display: 'block', width: '100%', minHeight: 80, margin: '12px 0', padding: 12, color: 'inherit', background: 'transparent', border: '1px solid var(--dsw-alias-border-l3)', borderRadius: 8, font: 'inherit' },
                onChange: event => setGoal(event.target.value) })),
              h('button', { type: 'submit', disabled: busy || !goal.trim() }, t('newStudy'))))),
        mode === 'environments' && view && h(React.Fragment, null,
          h('section', { className: 'hydro-card' }, h('h2', null, t('node')),
            h('p', null, view.node.platform, ' / ', view.node.arch, ' · CPU ', view.node.cpu_threads, ' · ', (view.node.memory_bytes / 1073741824).toFixed(1), ' GiB'),
            h('dl', null, detail('python', view.python_version + ' · ' + view.interpreter), detail('virtualEnvironment', view.virtual_environment),
              detail('uvPath', (view.uv_version ?? '—') + ' · ' + view.uv_executable), detail('runtime', view.node.runtime_root), detail('lockDigest', view.lock_digest))),
          h('div', { className: 'hydro-notice' }, t('metadataOnly')),
          ...Object.entries(view.packages).map(([name, value]) => h('section', { key: name, className: 'hydro-card', style: { marginBottom: 12 } },
            h('h2', null, name), h('p', null, t('installedVersion'), ' ', value.version, ' · ', t('expectedVersion'), ' ', value.expected),
            h('div', { className: 'hydro-ref' }, value.module_path),
            h('details', null, h('summary', null, t('provenance')), h('pre', null, JSON.stringify(value.source, null, 2))))))))
    }
    function Page({ load, openChat, t }) {
      const [view, setView] = React.useState(null), [busy, setBusy] = React.useState(false)
      const [error, setError] = React.useState(''), [tab, setTab] = React.useState('overview')
      const alive = React.useRef(true), request = React.useRef(0)
      async function refresh() {
        const id = ++request.current
        setBusy(true); setError('')
        try { const result = await load(); if (alive.current && id === request.current) setView(result) }
        catch (failure) { if (alive.current && id === request.current) setError(failure.message) }
        finally { if (alive.current && id === request.current) setBusy(false) }
      }
      React.useEffect(() => { alive.current = true; void refresh(); return () => { alive.current = false } }, [])
      async function chat(review) {
        setError('')
        try { await openChat(review ? t('inspectPrompt') : undefined) }
        catch (failure) { if (alive.current) setError(failure.message) }
      }
      const list = view?.activities ?? []
      const calibrated = list.find(a => a.operation === 'hydromodel.calibrate' && a.result?.model_id === 'xaj')
      const validated = list.find(a => a.operation === 'hydromodel.simulate' && a.result?.data_role === 'validation')
      const metric = validated?.result?.evaluation?.metrics?.NSE?.value
      const fmt = value => typeof value === 'number' && Number.isFinite(value) ? value.toFixed(3) : '—'
      const date = value => value ? new Date(value).toLocaleString() : '—'
      const taskRows = rows => h('table', { className: 'hydro-table' },
        h('thead', null, h('tr', null, h('th', { style: { width: '50%' } }, t('operation')), h('th', null, t('state')), h('th', null, t('time')))),
        h('tbody', null, ...rows.map(a => h('tr', { key: a.activity_ref },
          h('td', null, a.operation, h('details', null, h('summary', null, t('evidence')), h('pre', null, JSON.stringify(a, null, 2)))),
          h('td', null, ['succeeded', 'failed', 'running', 'cancelled'].includes(a.status) ? t(a.status) : a.status),
          h('td', { className: 'hydro-muted' }, date(a.created_at))))))
      return h('div', { className: 'hydro-page', 'aria-busy': busy }, h('style', null, css), h('div', { className: 'hydro-inner' },
        h('div', { className: 'hydro-kicker' }, t('subtitle')), h('h1', null, t('title')),
        h('p', { className: 'hydro-muted' }, t('intro')),
        h('div', { className: 'hydro-actions' }, h('button', { className: 'hydro-primary', onClick: () => chat(false) }, t('chat')),
          h('button', { onClick: () => chat(true) }, t('inspect')), h('button', { onClick: refresh, disabled: busy }, t('refresh'))),
        h('div', { className: 'hydro-muted' }, t('demo')),
        h('div', { className: 'hydro-flow' }, ...['data', 'model', 'train', 'evaluate'].map((key, i) => h('div', { className: 'hydro-card', key },
          h('span', { className: 'hydro-step' }, `0${i + 1}`), h('strong', null, t(key)), h('span', { className: 'hydro-muted' }, t(key + 'Desc'))))),
        h('div', { className: 'hydro-tabs', role: 'tablist' }, ...['overview', 'tasks', 'figures'].map(key => h('button', { key, role: 'tab', 'aria-selected': key === tab, onClick: () => setTab(key) }, t(key)))),
        error && h('div', { className: 'hydro-notice', role: 'alert' }, error, ' ', h('button', { onClick: refresh }, t('retry'))),
        busy && !view && h('div', { className: 'hydro-muted', role: 'status' }, t('loading')),
        view && h(React.Fragment, null,
          h('div', { className: 'hydro-muted' }, t('updated'), ' · ', date(view.updated_at)),
          view.warnings.length > 0 && h('details', { className: 'hydro-notice' }, h('summary', null, t('warn')), h('pre', null, view.warnings.join('\n'))),
          !view.study && h('p', { className: 'hydro-notice' }, t('empty')),
          tab === 'overview' && h(React.Fragment, null,
            h('div', { className: 'hydro-metrics' }, ...[
              [t('completed'), list.filter(a => a.status === 'succeeded').length, t('recent')],
              [t('imageCount'), view.images.length, t('figures')],
              [t('calibration'), fmt(calibrated?.result?.objective?.value), calibrated?.result?.stop_reason === 'budget_exhausted' ? t('stop') : calibrated?.result?.stop_reason ?? t('noMetric')],
              [t('validation'), fmt(metric), validated?.result?.data?.period?.join(' → ') ?? t('noMetric')],
            ].map(([label, value, note]) => h('div', { className: 'hydro-card', key: label }, h('div', { className: 'hydro-muted' }, label), h('div', { className: 'hydro-stat' }, value), h('small', { className: 'hydro-muted' }, note)))),
            view.study && h('section', { className: 'hydro-card' }, h('h2', null, t('research')), h('p', null, view.study.goal), h('div', { className: 'hydro-ref hydro-muted' }, view.study.study_ref)),
            h('div', { className: 'hydro-notice hydro-muted' }, t('bounds')), h('h2', null, t('recent')), taskRows(list.slice(0, 6))),
          tab === 'tasks' && taskRows(list),
          tab === 'figures' && (view.images.length ? h('div', { className: 'hydro-gallery' }, ...view.images.map(image => h('figure', { className: 'hydro-card', key: image.reference.content_hash },
            h('a', { href: image.src, download: image.reference.content_hash + '.png' }, h('img', { src: image.src, alt: image.operation, loading: 'lazy' })),
            h('figcaption', null, image.operation, h('div', { className: 'hydro-ref hydro-muted' }, image.reference.artifact_id))))) : h('p', { className: 'hydro-muted' }, t('noFigures'))))))
    }
    return {
      inject: ['slots', 'locale', 'sessions', 'remote', 'remote.commands', 'workspaces', 'uiWorkspace', 'sidebarRight', 'sidebarRightTabs'],
      apply(ctx) {
        const ns = 'hydrosystemWorkbench'
        ctx.effect(() => ctx.locale.register(ns, { zh, en }))
        const t = ctx.locale.bind(ns)
        let querySession
        let sessionPromise
        const loading = new Map()
        async function ensureQuerySession() {
          if (querySession) return querySession
          sessionPromise ??= ctx.sessions.create({ agentPreset: 'hydrology' }).then(id => { querySession = id; return id })
            .catch(error => { sessionPromise = undefined; throw error })
          return sessionPromise
        }
        async function load(sessionId) {
          const id = sessionId ?? await ensureQuerySession()
          if (!loading.has(id)) loading.set(id, command('hydro_workspace', undefined, id).finally(() => { loading.delete(id) }))
          return loading.get(id)
        }
        async function command(name, args, sessionId) {
          const id = sessionId ?? await ensureQuerySession()
          return ctx.sessions.using(id, { source: 'controllerOperation' }, async () => {
            const result = await ctx.remote.commands.execute(id, '/' + name + (args ? ' ' + JSON.stringify(args) : ''), [])
            if (!result.ok) throw new Error(result.error.message)
            if (!result.value) throw new Error(t('commandUnavailable'))
            const answer = result.value.result
            if (answer.kind !== 'success') throw new Error(answer.text ?? answer.kind)
            return JSON.parse(answer.text)
          })
        }
        async function openChat(prompt, workspaceId) {
          const choices = ctx.workspaces.list.getSnapshot().items
          const workspace = choices.find(item => item.workspaceId === workspaceId) ?? (choices.length === 1 ? choices[0] : undefined)
          if (!workspace) throw new Error(t('workspaceRequired'))
          const selection = await command('hydro_studies')
          const id = await ctx.sessions.create({ workspaceId: workspace.workspaceId, agentPreset: 'hydrology' })
          if (selection.studies.some(study => study.id === selection.selected)) await command('hydro_studies', { action: 'select', id: selection.selected }, id)
          ctx.uiWorkspace.openSession(id)
          if (prompt) await ctx.sessions.using(id, { source: 'controllerOperation' }, async reference => {
            const result = await reference.binding.session.prompt([{ type: 'text', text: prompt }], 'queue')
            if (!result.ok) throw new Error(result.error.message)
          })
        }
        function watch(sessionId, listener) {
          const binding = ctx.sessions.binding(sessionId)
          if (!binding) return () => {}
          return binding.eventSource.subscribe(() => {
            const change = binding.eventSource.getSnapshot().change
            if (change.kind !== 'append') return
            if (change.entries.some(entry => entry.type === 'event' &&
              ['job/registered', 'job/settled', 'turn/end'].includes(entry.event.type))) void listener()
          })
        }
        for (const [mode, kind, label] of [['results', 'hydro-results', 'results'], ['tasks', 'hydro-tasks', 'trials']]) {
          const id = '@iheadwater/dsh-hydrosystem/' + mode
          ctx.effect(() => ctx.sidebarRightTabs.register({ id, kind, title: () => t(label),
            guide: [{ id: kind, order: mode === 'results' ? 5 : 6, title: () => t(label),
              description: () => t('boundStudy'), icon: Icon }],
          }))
          ctx.slots.inject('sidebar.right.pane.tab', () => ctx.slots.register({
            name: 'sidebar.right.pane.tab', key: id, locale: ns,
            inject: sessionId => ({ load: () => load(sessionId), watch: listener => watch(sessionId, listener), mode,
              storageKey: 'hydrosystem:view:' + sessionId + ':' + mode, t }),
          }, ResearchPane))
        }
        ctx.slots.inject('conversation.session.header.actions', () => ctx.slots.register({
          name: 'conversation.session.header.actions', id: 'hydrosystem-results', order: 30, locale: ns,
          inject: sessionId => ({ open: kind => ctx.sidebarRight.openTabIn(sessionId, kind), t }),
        }, ResearchHeader))
        ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key: 'hydrology', locale: ns,
          inject: () => ({ load, openChat, t }),
        }, Page))
        ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({ name: 'sidebar.panellist', id: 'hydrology',
          order: 1, label: () => t('panel'), locale: ns,
        }, Icon))
        for (const [mode, order] of [['studies', 2], ['environments', 3]]) {
          const key = 'hydrology-' + mode
          ctx.slots.inject('main', () => ctx.slots.register({ name: 'main', key, locale: ns,
            inject: () => ({ mode, query: request => command(mode === 'studies' ? 'hydro_studies' : 'hydro_environment', request), openChat, workspaceSource: ctx.workspaces.list, t }),
          }, ManagementPage))
          ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({ name: 'sidebar.panellist', id: key,
            order, label: () => t(mode), locale: ns,
          }, Icon))
        }
      },
    }
  },
})
