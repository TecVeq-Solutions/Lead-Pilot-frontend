import React, { useState, useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  MarkerType,
  type Connection,
  type Edge,
  type Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Zap,
  Filter,
  CheckSquare,
  Globe,
  Clock,
  Save,
  Play,
  Trash2,
  AlertCircle,
  CheckCircle2,
  X,
  Sparkles,
} from 'lucide-react';
import { api } from '../../services/api';
import type { AutomationRule, User as UserModel } from '../../types';

// Custom Trigger Node Component
const TriggerNodeComponent: React.FC<{ data: any }> = ({ data }) => {
  return (
    <div className="bg-white border-2 border-indigo-500 rounded-xl shadow-lg p-3.5 min-w-[220px] text-slate-800 transition-all hover:shadow-indigo-500/20">
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
          <Zap className="w-4 h-4 fill-current" />
        </div>
        <div className="flex-1">
          <div className="text-[10px] uppercase font-black tracking-wider text-indigo-500">TRIGGER</div>
          <div className="text-xs font-bold text-slate-900 truncate">{data.label || 'Trigger Event'}</div>
        </div>
      </div>
      <div className="text-[11px] text-slate-600 bg-slate-50 rounded p-1.5 border border-slate-200">
        {data.summary || 'Select trigger event...'}
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-indigo-500 border-2 border-white" />
    </div>
  );
};

// Custom Condition Node Component
const ConditionNodeComponent: React.FC<{ data: any }> = ({ data }) => {
  return (
    <div className="bg-white border-2 border-amber-500 rounded-xl shadow-lg p-3.5 min-w-[220px] text-slate-800 transition-all hover:shadow-amber-500/20">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-amber-500 border-2 border-white" />
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
          <Filter className="w-4 h-4" />
        </div>
        <div className="flex-1">
          <div className="text-[10px] uppercase font-black tracking-wider text-amber-500">CONDITION</div>
          <div className="text-xs font-bold text-slate-900 truncate">{data.label || 'Filter Rules'}</div>
        </div>
      </div>
      <div className="text-[11px] text-slate-600 bg-slate-50 rounded p-1.5 border border-slate-200">
        {data.summary || 'Lead Score >= 50'}
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-amber-500 border-2 border-white" />
    </div>
  );
};

// Custom Action Node Component
const ActionNodeComponent: React.FC<{ data: any }> = ({ data }) => {
  return (
    <div className="bg-white border-2 border-emerald-500 rounded-xl shadow-lg p-3.5 min-w-[220px] text-slate-800 transition-all hover:shadow-emerald-500/20">
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-emerald-500 border-2 border-white" />
      <div className="flex items-center gap-2 mb-1.5">
        <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
          {data.actionType === 'send_webhook' ? <Globe className="w-4 h-4" /> : <CheckSquare className="w-4 h-4" />}
        </div>
        <div className="flex-1">
          <div className="text-[10px] uppercase font-black tracking-wider text-emerald-600">ACTION</div>
          <div className="text-xs font-bold text-slate-900 truncate">{data.label || 'Execute Action'}</div>
        </div>
      </div>
      <div className="text-[11px] text-slate-600 bg-slate-50 rounded p-1.5 border border-slate-200">
        {data.summary || 'Create follow-up task'}
      </div>
      {data.delayHours ? (
        <div className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
          <Clock className="w-3 h-3" /> Delay: {data.delayHours}h
        </div>
      ) : null}
    </div>
  );
};

interface VisualWorkflowBuilderProps {
  automation?: AutomationRule | null;
  initialRule?: AutomationRule | null;
  onClose: () => void;
  onSaved: () => void;
  teamUsers?: UserModel[];
}

export const VisualWorkflowBuilder: React.FC<VisualWorkflowBuilderProps> = ({
  automation,
  initialRule,
  onClose,
  onSaved,
  teamUsers: _teamUsers = [],
}) => {
  const activeAutomation = automation || initialRule;
  const nodeTypes = useMemo(
    () => ({
      triggerNode: TriggerNodeComponent,
      conditionNode: ConditionNodeComponent,
      actionNode: ActionNodeComponent,
    }),
    []
  );

  // Workflow basic metadata
  const [workflowName, setWorkflowName] = useState(activeAutomation?.name || 'New Custom Workflow');
  const [workflowStatus, setWorkflowStatus] = useState<'active' | 'inactive' | 'draft'>(
    activeAutomation?.status || 'active'
  );
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Default Initial Nodes
  const defaultNodes: Node[] = [
    {
      id: 'node-trigger-1',
      type: 'triggerNode',
      position: { x: 250, y: 50 },
      data: {
        label: 'Inactive Conversation',
        triggerType: 'inactive_conversation',
        inactiveHours: 48,
        summary: 'No reply for 48 hours',
      },
    },
    {
      id: 'node-condition-1',
      type: 'conditionNode',
      position: { x: 250, y: 190 },
      data: {
        label: 'Lead Score Filter',
        minLeadScore: 60,
        summary: 'Lead Score >= 60 (Hot Lead)',
      },
    },
    {
      id: 'node-action-1',
      type: 'actionNode',
      position: { x: 250, y: 330 },
      data: {
        label: 'Create Follow-up Task',
        actionType: 'create_task',
        priority: 'urgent',
        taskTitle: 'Urgent: Follow up with stalled high-intent lead',
        dueInHours: 24,
        delayHours: 0,
        summary: 'Create task (Priority: Urgent)',
      },
    },
  ];

  const defaultEdges: Edge[] = [
    {
      id: 'edge-1-2',
      source: 'node-trigger-1',
      target: 'node-condition-1',
      animated: true,
      style: { stroke: '#6366F1', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#6366F1' },
    },
    {
      id: 'edge-2-3',
      source: 'node-condition-1',
      target: 'node-action-1',
      animated: true,
      style: { stroke: '#10B981', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#10B981' },
    },
  ];

  // Initialize from existing layout if present
  const initialNodes = automation?.visual_layout?.nodes || defaultNodes;
  const initialEdges = automation?.visual_layout?.edges || defaultEdges;

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            style: { stroke: '#0F9F8F', strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: '#0F9F8F' },
          },
          eds
        )
      ),
    [setEdges]
  );

  const selectedNode = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) || null,
    [nodes, selectedNodeId]
  );

  // Update selected node data helper
  const updateSelectedNodeData = (updates: Record<string, any>) => {
    if (!selectedNodeId) return;
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === selectedNodeId) {
          const newData = { ...node.data, ...updates };
          return { ...node, data: newData };
        }
        return node;
      })
    );
  };

  // Add New Node Helpers
  const addNode = (type: 'triggerNode' | 'conditionNode' | 'actionNode') => {
    const id = `node-${type}-${Date.now()}`;
    const x = 100 + Math.random() * 200;
    const y = 100 + Math.random() * 200;

    let newNode: Node;
    if (type === 'triggerNode') {
      newNode = {
        id,
        type,
        position: { x, y },
        data: {
          label: 'Inbound Keyword',
          triggerType: 'inbound_keyword',
          keywords: 'quote, demo, pricing',
          summary: 'Inbound contains "demo, quote"',
        },
      };
    } else if (type === 'conditionNode') {
      newNode = {
        id,
        type,
        position: { x, y },
        data: {
          label: 'Lead Score Check',
          minLeadScore: 50,
          summary: 'Lead Score >= 50',
        },
      };
    } else {
      newNode = {
        id,
        type,
        position: { x, y },
        data: {
          label: 'Add VIP Tag',
          actionType: 'add_tag',
          tagName: 'VIP Client',
          delayHours: 0,
          summary: 'Attach tag "VIP Client"',
        },
      };
    }

    setNodes((nds) => nds.concat(newNode));
    setSelectedNodeId(id);
  };

  // Delete Node
  const deleteSelectedNode = () => {
    if (!selectedNodeId) return;
    setNodes((nds) => nds.filter((n) => n.id !== selectedNodeId));
    setEdges((eds) => eds.filter((e) => e.source !== selectedNodeId && e.target !== selectedNodeId));
    setSelectedNodeId(null);
  };

  // Template Loader
  const loadTemplate = (templateKey: string) => {
    if (templateKey === 'keyword_demo') {
      setWorkflowName('Immediate Demo Request Task');
      setNodes([
        {
          id: 'n1',
          type: 'triggerNode',
          position: { x: 250, y: 50 },
          data: {
            label: 'Inbound Keyword Match',
            triggerType: 'inbound_keyword',
            keywords: 'demo, presentation, meeting',
            summary: 'Contains "demo, presentation"',
          },
        },
        {
          id: 'n2',
          type: 'actionNode',
          position: { x: 250, y: 230 },
          data: {
            label: 'Schedule Urgent Demo Task',
            actionType: 'create_task',
            priority: 'urgent',
            taskTitle: 'Urgent: Customer requested demo presentation',
            dueInHours: 2,
            delayHours: 0,
            summary: 'Priority: Urgent, Due in 2h',
          },
        },
      ]);
      setEdges([
        {
          id: 'e1-2',
          source: 'n1',
          target: 'n2',
          animated: true,
          style: { stroke: '#0F9F8F', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#0F9F8F' },
        },
      ]);
    } else if (templateKey === 'delayed_48h') {
      setWorkflowName('48-Hour Stalled Lead Check');
      setNodes([
        {
          id: 'n1',
          type: 'triggerNode',
          position: { x: 250, y: 50 },
          data: {
            label: 'Inactive Conversation',
            triggerType: 'inactive_conversation',
            inactiveHours: 48,
            summary: 'Inactive for 48 hours',
          },
        },
        {
          id: 'n2',
          type: 'actionNode',
          position: { x: 250, y: 230 },
          data: {
            label: 'Delayed Check Action',
            actionType: 'create_task',
            priority: 'medium',
            taskTitle: 'Check stalled deal progress',
            dueInHours: 24,
            delayHours: 48,
            summary: 'Delayed by 48 hours',
          },
        },
      ]);
      setEdges([
        {
          id: 'e1-2',
          source: 'n1',
          target: 'n2',
          animated: true,
          style: { stroke: '#0F9F8F', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#0F9F8F' },
        },
      ]);
    } else if (templateKey === 'webhook_export') {
      setWorkflowName('External CRM Lead Webhook');
      setNodes([
        {
          id: 'n1',
          type: 'triggerNode',
          position: { x: 250, y: 50 },
          data: {
            label: 'Contact Tag Added',
            triggerType: 'contact_tag_added',
            summary: 'When tag attached',
          },
        },
        {
          id: 'n2',
          type: 'actionNode',
          position: { x: 250, y: 230 },
          data: {
            label: 'Send Webhook POST',
            actionType: 'send_webhook',
            webhookUrl: 'https://api.mycrm.com/leads/webhook',
            summary: 'POST to external CRM',
          },
        },
      ]);
      setEdges([
        {
          id: 'e1-2',
          source: 'n1',
          target: 'n2',
          animated: true,
          style: { stroke: '#0F9F8F', strokeWidth: 2 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#0F9F8F' },
        },
      ]);
    }
  };

  // Compile visual canvas to backend automation definition
  const compileWorkflow = () => {
    const triggerNode = nodes.find((n) => n.type === 'triggerNode');
    if (!triggerNode) {
      throw new Error('Workflow must contain at least one Trigger node.');
    }

    const actionNodes = nodes.filter((n) => n.type === 'actionNode');
    if (actionNodes.length === 0) {
      throw new Error('Workflow must contain at least one Action node.');
    }

    const primaryAction = actionNodes[0].data;
    const triggerData = triggerNode.data;

    // Conditions
    const conditionNodes = nodes.filter((n) => n.type === 'conditionNode');
    const conditions: Record<string, any> = {};
    if (conditionNodes.length > 0) {
      const cData = conditionNodes[0].data;
      if (cData.minLeadScore) conditions.min_lead_score = parseInt(cData.minLeadScore, 10);
    }

    const definition: Record<string, any> = {
      action: primaryAction.actionType || 'create_task',
      task_title: primaryAction.taskTitle || `Follow up triggered by ${workflowName}`,
      priority: primaryAction.priority || 'medium',
      due_in_hours: parseInt(primaryAction.dueInHours || 24, 10),
      delay_hours: parseInt(primaryAction.delayHours || 0, 10),
      inactive_hours: parseInt(triggerData.inactiveHours || 48, 10),
      keywords: triggerData.keywords || '',
      tag_name: primaryAction.tagName || '',
      webhook_url: primaryAction.webhookUrl || '',
      conditions,
    };

    const visual_layout = {
      nodes,
      edges,
    };

    return {
      name: workflowName,
      trigger_type: triggerData.triggerType || 'inactive_conversation',
      definition,
      visual_layout,
      status: workflowStatus,
    };
  };

  // Save to Backend
  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const payload = compileWorkflow();

      if (automation?.id) {
        await api.patch(`/automations/${automation.id}`, payload);
      } else {
        await api.post('/automations', payload);
      }

      setFeedback({ type: 'success', message: 'Workflow saved successfully!' });
      setTimeout(() => {
        onSaved();
      }, 1000);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to save workflow.';
      setFeedback({ type: 'error', message: msg });
    } finally {
      setSaving(false);
    }
  };

  // Test Run
  const handleTestRun = async () => {
    setTesting(true);
    setFeedback(null);
    try {
      const res = await api.post('/automations/evaluate');
      setFeedback({
        type: 'success',
        message: `Evaluation completed! Tasks created: ${res.data?.data?.tasks_created ?? 0}`,
      });
    } catch (err: any) {
      setFeedback({ type: 'error', message: 'Failed to test run automations.' });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex z-50 overflow-hidden font-poppins animate-in fade-in duration-200">
      <div className="flex-1 flex flex-col bg-[#F3F6FA] w-full h-full">
        {/* Top Control Bar */}
        <header className="h-16 bg-[#0D2038] text-white px-6 flex items-center justify-between shrink-0 shadow-md z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#0F9F8F] rounded-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <input
                type="text"
                value={workflowName}
                onChange={(e) => setWorkflowName(e.target.value)}
                className="bg-transparent text-white font-extrabold text-base border-b border-transparent hover:border-slate-500 focus:border-[#0F9F8F] focus:outline-none px-1 py-0.5"
                placeholder="Workflow Name..."
              />
              <div className="text-[11px] text-[#CBD5E1] font-medium">Visual Flowchart Automation Engine</div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-3">
            {/* Template Selector */}
            <div className="relative">
              <select
                onChange={(e) => {
                  if (e.target.value) loadTemplate(e.target.value);
                }}
                defaultValue=""
                className="bg-[#103B52] border border-[#CBD5E1]/20 text-white text-xs font-bold rounded-lg px-3 py-2 cursor-pointer focus:outline-none focus:border-[#0F9F8F]"
              >
                <option value="" disabled>
                  Load Pre-built Template...
                </option>
                <option value="delayed_48h">48h Delayed Lead Check</option>
                <option value="keyword_demo">Inbound "Demo" Urgent Task</option>
                <option value="webhook_export">External CRM Webhook Export</option>
              </select>
            </div>

            {/* Status Selector */}
            <select
              value={workflowStatus}
              onChange={(e) => setWorkflowStatus(e.target.value as any)}
              className="bg-[#103B52] border border-[#CBD5E1]/20 text-white text-xs font-bold rounded-lg px-3 py-2 cursor-pointer focus:outline-none"
            >
              <option value="active">Status: Active</option>
              <option value="draft">Status: Draft</option>
              <option value="inactive">Status: Inactive</option>
            </select>

            {/* Test Run Button */}
            <button
              onClick={handleTestRun}
              disabled={testing}
              className="px-3.5 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              {testing ? 'Testing...' : 'Test Run'}
            </button>

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 bg-[#0F9F8F] hover:bg-[#0B897D] text-white text-xs font-black rounded-lg flex items-center gap-2 shadow-sm transition-all"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Workflow'}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`px-6 py-2.5 text-xs font-bold flex items-center justify-between shrink-0 ${
              feedback.type === 'success'
                ? 'bg-emerald-500 text-white'
                : 'bg-rose-500 text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <AlertCircle className="w-4 h-4" />
              )}
              <span>{feedback.message}</span>
            </div>
            <button onClick={() => setFeedback(null)}>
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Workspace Canvas + Sidebar */}
        <div className="flex-1 flex relative overflow-hidden">
          {/* Node Palette Bar (Floating over canvas top-left) */}
          <div className="absolute top-4 left-4 z-20 flex items-center gap-2 bg-white/95 backdrop-blur-xs border border-slate-300 rounded-xl p-2 shadow-md">
            <span className="text-xs font-black text-slate-500 px-2 uppercase tracking-wider">Add Node:</span>
            <button
              onClick={() => addNode('triggerNode')}
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-colors"
            >
              <Zap className="w-3.5 h-3.5 fill-current" /> Trigger
            </button>
            <button
              onClick={() => addNode('conditionNode')}
              className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-colors"
            >
              <Filter className="w-3.5 h-3.5" /> Condition
            </button>
            <button
              onClick={() => addNode('actionNode')}
              className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-extrabold flex items-center gap-1.5 transition-colors"
            >
              <CheckSquare className="w-3.5 h-3.5" /> Action
            </button>
          </div>

          {/* React Flow Canvas */}
          <div className="flex-1 h-full">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              nodeTypes={nodeTypes}
              onNodeClick={(_, node) => setSelectedNodeId(node.id)}
              onPaneClick={() => setSelectedNodeId(null)}
              fitView
            >
              <Background gap={16} size={1} color="#CBD5E1" />
              <Controls />
              <MiniMap nodeStrokeWidth={3} zoomable pannable />
            </ReactFlow>
          </div>

          {/* Node Config Drawer (Right Sidebar) */}
          {selectedNode && (
            <div className="w-80 bg-white border-l border-slate-300 flex flex-col p-5 shadow-xl z-20 overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
                <div className="text-sm font-black text-slate-900 uppercase tracking-tight">Configure Node</div>
                <button
                  onClick={() => setSelectedNodeId(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Node Title */}
              <div className="space-y-4 text-xs font-bold text-slate-700">
                <div>
                  <label className="text-[11px] font-black uppercase text-slate-500 block mb-1">Node Title</label>
                  <input
                    type="text"
                    value={selectedNode.data?.label || ''}
                    onChange={(e) => updateSelectedNodeData({ label: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#0F9F8F]"
                  />
                </div>

                {/* If Trigger Node */}
                {selectedNode.type === 'triggerNode' && (
                  <>
                    <div>
                      <label className="text-[11px] font-black uppercase text-slate-500 block mb-1">Trigger Type</label>
                      <select
                        value={selectedNode.data?.triggerType || 'inactive_conversation'}
                        onChange={(e) => {
                          const val = e.target.value;
                          let sum = 'Trigger event';
                          if (val === 'inactive_conversation') sum = 'Inactive for 48 hours';
                          if (val === 'inbound_keyword') sum = 'Inbound keyword match';
                          if (val === 'contact_tag_added') sum = 'Contact tag attached';
                          if (val === 'lead_stage_entered') sum = 'Deal entered stage';
                          updateSelectedNodeData({ triggerType: val, summary: sum });
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#0F9F8F]"
                      >
                        <option value="inactive_conversation">Inactive Conversation Duration</option>
                        <option value="inbound_keyword">Inbound WhatsApp Keyword Match</option>
                        <option value="contact_tag_added">Contact Tag Attached</option>
                        <option value="lead_stage_entered">Lead Entered Pipeline Stage</option>
                      </select>
                    </div>

                    {selectedNode.data?.triggerType === 'inactive_conversation' && (
                      <div>
                        <label className="text-[11px] font-black uppercase text-slate-500 block mb-1">
                          Inactive Threshold (Hours)
                        </label>
                        <input
                          type="number"
                          value={selectedNode.data?.inactiveHours || 48}
                          onChange={(e) =>
                            updateSelectedNodeData({
                              inactiveHours: e.target.value,
                              summary: `No reply for ${e.target.value}h`,
                            })
                          }
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#0F9F8F]"
                        />
                      </div>
                    )}

                    {selectedNode.data?.triggerType === 'inbound_keyword' && (
                      <div>
                        <label className="text-[11px] font-black uppercase text-slate-500 block mb-1">
                          Keywords (comma separated)
                        </label>
                        <input
                          type="text"
                          value={selectedNode.data?.keywords || ''}
                          onChange={(e) =>
                            updateSelectedNodeData({
                              keywords: e.target.value,
                              summary: `Contains: "${e.target.value}"`,
                            })
                          }
                          placeholder="e.g. quote, price, demo"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#0F9F8F]"
                        />
                      </div>
                    )}
                  </>
                )}

                {/* If Condition Node */}
                {selectedNode.type === 'conditionNode' && (
                  <div>
                    <label className="text-[11px] font-black uppercase text-slate-500 block mb-1">
                      Minimum AI Lead Score
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={selectedNode.data?.minLeadScore || 50}
                      onChange={(e) =>
                        updateSelectedNodeData({
                          minLeadScore: e.target.value,
                          summary: `Lead Score >= ${e.target.value}`,
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#0F9F8F]"
                    />
                  </div>
                )}

                {/* If Action Node */}
                {selectedNode.type === 'actionNode' && (
                  <>
                    <div>
                      <label className="text-[11px] font-black uppercase text-slate-500 block mb-1">Action Type</label>
                      <select
                        value={selectedNode.data?.actionType || 'create_task'}
                        onChange={(e) => {
                          const val = e.target.value;
                          let sum = 'Execute action';
                          if (val === 'create_task') sum = 'Create follow-up task';
                          if (val === 'add_tag') sum = 'Attach tag to contact';
                          if (val === 'remove_tag') sum = 'Remove tag from contact';
                          if (val === 'send_webhook') sum = 'POST JSON to Webhook';
                          updateSelectedNodeData({ actionType: val, summary: sum });
                        }}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#0F9F8F]"
                      >
                        <option value="create_task">Create Follow-up Task</option>
                        <option value="add_tag">Add Tag to Contact</option>
                        <option value="remove_tag">Remove Tag from Contact</option>
                        <option value="send_webhook">Send Webhook (HTTP POST)</option>
                      </select>
                    </div>

                    {selectedNode.data?.actionType === 'create_task' && (
                      <>
                        <div>
                          <label className="text-[11px] font-black uppercase text-slate-500 block mb-1">
                            Task Title
                          </label>
                          <input
                            type="text"
                            value={selectedNode.data?.taskTitle || ''}
                            onChange={(e) => updateSelectedNodeData({ taskTitle: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#0F9F8F]"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-black uppercase text-slate-500 block mb-1">Priority</label>
                          <select
                            value={selectedNode.data?.priority || 'medium'}
                            onChange={(e) => updateSelectedNodeData({ priority: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none"
                          >
                            <option value="urgent">Urgent</option>
                            <option value="high">High</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                          </select>
                        </div>
                      </>
                    )}

                    {selectedNode.data?.actionType === 'add_tag' && (
                      <div>
                        <label className="text-[11px] font-black uppercase text-slate-500 block mb-1">Tag Name</label>
                        <input
                          type="text"
                          value={selectedNode.data?.tagName || ''}
                          onChange={(e) =>
                            updateSelectedNodeData({
                              tagName: e.target.value,
                              summary: `Tag: "${e.target.value}"`,
                            })
                          }
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#0F9F8F]"
                        />
                      </div>
                    )}

                    {selectedNode.data?.actionType === 'send_webhook' && (
                      <div>
                        <label className="text-[11px] font-black uppercase text-slate-500 block mb-1">
                          Destination Webhook URL
                        </label>
                        <input
                          type="url"
                          value={selectedNode.data?.webhookUrl || ''}
                          onChange={(e) =>
                            updateSelectedNodeData({
                              webhookUrl: e.target.value,
                              summary: `POST: ${e.target.value}`,
                            })
                          }
                          placeholder="https://your-crm.com/api/webhook"
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#0F9F8F]"
                        />
                      </div>
                    )}

                    <div>
                      <label className="text-[11px] font-black uppercase text-slate-500 block mb-1">
                        Execution Delay (Hours)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={selectedNode.data?.delayHours || 0}
                        onChange={(e) => updateSelectedNodeData({ delayHours: parseInt(e.target.value, 10) || 0 })}
                        placeholder="0 for immediate"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:border-[#0F9F8F]"
                      />
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        Set 48 for a 48-hour delayed execution via Redis Horizon.
                      </span>
                    </div>
                  </>
                )}

                {/* Delete Node Button */}
                <div className="pt-4 border-t border-slate-200">
                  <button
                    onClick={deleteSelectedNode}
                    className="w-full py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove Node
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
