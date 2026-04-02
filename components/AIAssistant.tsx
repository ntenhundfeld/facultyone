import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AIChatMessage, AppData, Task } from '../types';
import { generateAIResponse } from '../services/openAIService';
import { Send, Bot, Sparkles, Loader2, AlertTriangle, Clock3, Layers3, Zap } from 'lucide-react';
import { isOverdueDate, isWithinDays } from '../utils/date';

interface AIAssistantProps {
  appData: AppData;
  currentView: string;
  activeItemId?: string | null;
  aiApiKey: string;
  aiModel: string;
}

const renderInlineMarkdown = (text: string) => {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g).filter(Boolean);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={`${part}-${index}`} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code
          key={`${part}-${index}`}
          className="rounded bg-slate-200 px-1 py-0.5 font-mono text-[0.9em] text-slate-800 dark:bg-slate-800 dark:text-slate-100"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>;
  });
};

const renderMarkdown = (text: string) => {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index].trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,3})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = headingMatch[2];
      const headingClassName =
        level === 1
          ? 'text-lg font-bold'
          : level === 2
            ? 'text-base font-bold'
            : 'text-sm font-semibold uppercase tracking-wide';

      elements.push(
        <div key={`heading-${index}`} className={`mt-1 ${headingClassName}`}>
          {renderInlineMarkdown(content)}
        </div>,
      );
      index += 1;
      continue;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^[-*]\s+/, ''));
        index += 1;
      }

      elements.push(
        <ul key={`ul-${index}`} className="ml-5 list-disc space-y-1">
          {items.map((item, itemIndex) => (
            <li key={`ul-item-${itemIndex}`}>{renderInlineMarkdown(item)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\d+\.\s+/, ''));
        index += 1;
      }

      elements.push(
        <ol key={`ol-${index}`} className="ml-5 list-decimal space-y-1">
          {items.map((item, itemIndex) => (
            <li key={`ol-item-${itemIndex}`}>{renderInlineMarkdown(item)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    const paragraphLines = [trimmed];
    index += 1;
    while (index < lines.length) {
      const nextTrimmed = lines[index].trim();
      if (!nextTrimmed || /^(#{1,3})\s+/.test(nextTrimmed) || /^[-*]\s+/.test(nextTrimmed) || /^\d+\.\s+/.test(nextTrimmed)) {
        break;
      }
      paragraphLines.push(nextTrimmed);
      index += 1;
    }

    elements.push(
      <p key={`p-${index}`} className="leading-relaxed">
        {renderInlineMarkdown(paragraphLines.join(' '))}
      </p>,
    );
  }

  return <div className="space-y-3">{elements}</div>;
};

const getFocusEntity = (appData: AppData, currentView: string, activeItemId?: string | null) => {
  switch (currentView) {
    case 'research':
      return appData.projects.find(project => project.id === activeItemId) ?? null;
    case 'teaching':
      return appData.courses.find(course => course.id === activeItemId) ?? null;
    case 'personnel':
      return appData.personnel.find(person => person.id === activeItemId) ?? null;
    case 'service':
      return appData.serviceRoles.find(role => role.id === activeItemId) ?? null;
    default:
      return null;
  }
};

const getFocusEntityTasks = (tasks: Task[], currentView: string, activeItemId?: string | null) =>
  tasks.filter(task => {
    switch (currentView) {
      case 'research':
        return task.projectId === activeItemId;
      case 'teaching':
        return task.courseId === activeItemId;
      case 'personnel':
        return task.relatedPersonnelId === activeItemId || task.assigneeId === activeItemId;
      case 'service':
        return task.serviceRoleId === activeItemId;
      default:
        return false;
    }
  });

const formatFocusTitle = (entity: ReturnType<typeof getFocusEntity>) => {
  if (!entity) {
    return 'No record selected';
  }

  if ('title' in entity) {
    return entity.title;
  }

  if ('code' in entity) {
    return `${entity.code} · ${entity.name}`;
  }

  if ('department' in entity) {
    return `${entity.honorific ? `${entity.honorific} ` : ''}${entity.name}`;
  }

  return entity.name;
};

const buildContext = (appData: AppData, currentView: string, activeItemId?: string | null) => {
  const { tasks, projects, courses, personnel, serviceRoles, researchStages } = appData;
  const activeTasks = tasks.filter(task => task.status !== 'Done');
  const overdueTasks = activeTasks.filter(task => isOverdueDate(task.dueDate));
  const upcomingTasks = activeTasks.filter(task => !isOverdueDate(task.dueDate) && isWithinDays(task.dueDate, 7));
  const blockedTasks = activeTasks.filter(task => task.status === 'Blocked');
  const focusEntity = getFocusEntity(appData, currentView, activeItemId);
  const focusTasks = getFocusEntityTasks(activeTasks, currentView, activeItemId);

  const urgentTasks = [...activeTasks]
    .sort((left, right) => (left.dueDate ?? '9999-12-31').localeCompare(right.dueDate ?? '9999-12-31'))
    .slice(0, 8);

  const focusSummary = (() => {
    if (!focusEntity) {
      return 'No record is currently selected.';
    }

    switch (currentView) {
      case 'research':
        return `Selected research project: ${focusEntity.title}. Stage: ${focusEntity.stage}. Collaborators: ${focusEntity.collaborators.join(', ') || 'none'}. Notes: ${focusEntity.notes.join(' | ') || 'none'}. Linked active tasks: ${focusTasks.map(task => `${task.title}${task.dueDate ? ` (due ${task.dueDate})` : ''}`).join(' | ') || 'none'}.`;
      case 'teaching':
        return `Selected course: ${focusEntity.code} ${focusEntity.name}. Semester: ${focusEntity.semester}. Students: ${focusEntity.students.length}. Files: ${focusEntity.files.length}. Linked active tasks: ${focusTasks.map(task => `${task.title}${task.dueDate ? ` (due ${task.dueDate})` : ''}`).join(' | ') || 'none'}.`;
      case 'personnel':
        return `Selected personnel record: ${focusEntity.honorific ? `${focusEntity.honorific} ` : ''}${focusEntity.name}, ${focusEntity.role}, ${focusEntity.department}. Performance notes: ${focusEntity.performanceNotes.join(' | ') || 'none'}. Linked active tasks: ${focusTasks.map(task => `${task.title}${task.dueDate ? ` (due ${task.dueDate})` : ''}`).join(' | ') || 'none'}.`;
      case 'service':
        return `Selected service commitment: ${focusEntity.name}. Role: ${focusEntity.role}. Type: ${focusEntity.type}. Term end: ${focusEntity.termEnd ?? 'not set'}. Linked active tasks: ${focusTasks.map(task => `${task.title}${task.dueDate ? ` (due ${task.dueDate})` : ''}`).join(' | ') || 'none'}.`;
      default:
        return 'No record is currently selected.';
    }
  })();

  return {
    activeTasks,
    overdueTasks,
    upcomingTasks,
    blockedTasks,
    focusEntity,
    focusTasks,
    urgentTasks,
    context: [
      'Workspace summary:',
      `- Active tasks: ${activeTasks.length}`,
      `- Overdue tasks: ${overdueTasks.length}`,
      `- Upcoming tasks in the next 7 days: ${upcomingTasks.length}`,
      `- Blocked tasks: ${blockedTasks.length}`,
      `- Research projects: ${projects.length}`,
      `- Research stage breakdown: ${researchStages.map(stage => `${stage}: ${projects.filter(project => project.stage === stage).length}`).join(' | ')}`,
      `- Courses: ${courses.length}`,
      `- Personnel records: ${personnel.length}`,
      `- Service commitments: ${serviceRoles.length}`,
      `- Current view: ${currentView}`,
      `- Current focus: ${focusSummary}`,
      `- Most urgent tasks: ${urgentTasks.map(task => `${task.title} (${task.category}${task.dueDate ? `, due ${task.dueDate}` : ''}, ${task.status})`).join(' | ') || 'none'}`,
      `- Overdue details: ${overdueTasks.map(task => `${task.title}${task.dueDate ? ` (due ${task.dueDate})` : ''}`).join(' | ') || 'none'}`,
      `- Blocked details: ${blockedTasks.map(task => `${task.title} (${task.category})`).join(' | ') || 'none'}`,
    ].join('\n'),
  };
};

export const AIAssistant: React.FC<AIAssistantProps> = ({ appData, currentView, activeItemId, aiApiKey, aiModel }) => {
  const [messages, setMessages] = useState<AIChatMessage[]>([
    {
      role: 'model',
      text: 'Hello! I can work from your live app data to summarize risk, draft updates, and turn the current workload into practical next steps.',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const snapshot = useMemo(() => buildContext(appData, currentView, activeItemId), [appData, currentView, activeItemId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const quickPrompts = [
    'Summarize my overdue work and recommend what to do first.',
    'Draft a weekly chair update based on the current app data.',
    currentView === 'research' && activeItemId
      ? 'Review this research project and tell me the biggest risks, next milestones, and what I should unblock.'
      : 'Identify blocked work and suggest next actions.',
    currentView === 'personnel' && activeItemId
      ? 'Draft a concise supervision check-in for this faculty member based on their notes and tasks.'
      : 'Turn the next 7 days into a practical plan.',
    currentView === 'teaching' && activeItemId
      ? 'Summarize this course and propose the top teaching actions for the coming week.'
      : 'Draft a short email I can send to move one blocked item forward.',
  ];

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: AIChatMessage = {
      role: 'user',
      text: input,
      timestamp: new Date(),
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    
    if (!aiApiKey.trim()) {
      setMessages(prev => [
        ...prev,
        {
          role: 'model',
          text: 'OpenAI API key is not configured. Add it in Settings, then I can use ChatGPT with your selected model.',
          timestamp: new Date(),
        },
      ]);
      return;
    }

    setIsLoading(true);

    const responseText = await generateAIResponse({
      apiKey: aiApiKey,
      model: aiModel,
      prompt: userMessage.text,
      context: snapshot.context,
      conversationHistory: nextMessages,
    });

    const botMessage: AIChatMessage = {
      role: 'model',
      text: responseText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, botMessage]);
    setIsLoading(false);
  };

  return (
    <div className="mx-auto flex h-full max-w-5xl flex-col p-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-200 dark:shadow-none">
          <Bot size={28} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Smart Assistant</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Powered by ChatGPT ({aiModel}) with live workspace context</p>
        </div>
      </div>

      {!aiApiKey.trim() && (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-900/10 dark:text-amber-200">
          Add your OpenAI API key in Settings to enable ChatGPT responses. The key is stored only in this browser for local use.
        </div>
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-red-100 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-900/10">
          <div className="flex items-center gap-2 text-sm font-semibold text-red-700 dark:text-red-300">
            <AlertTriangle size={16} />
            Overdue
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{snapshot.overdueTasks.length}</div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Open items already past due</p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-900/10">
          <div className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-300">
            <Clock3 size={16} />
            This Week
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{snapshot.upcomingTasks.length}</div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Due in the next 7 days</p>
        </div>
        <div className="rounded-2xl border border-purple-100 bg-purple-50 p-4 dark:border-purple-900/40 dark:bg-purple-900/10">
          <div className="flex items-center gap-2 text-sm font-semibold text-purple-700 dark:text-purple-300">
            <Layers3 size={16} />
            Blocked
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">{snapshot.blockedTasks.length}</div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Items waiting on a dependency</p>
        </div>
        <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 dark:border-blue-900/40 dark:bg-blue-900/10">
          <div className="flex items-center gap-2 text-sm font-semibold text-blue-700 dark:text-blue-300">
            <Zap size={16} />
            Current Focus
          </div>
          <div className="mt-2 truncate text-base font-bold text-slate-900 dark:text-white">{formatFocusTitle(snapshot.focusEntity)}</div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {snapshot.focusTasks.length > 0 ? `${snapshot.focusTasks.length} active linked tasks` : 'Working from workspace-wide context'}
          </p>
        </div>
      </div>

      {snapshot.focusEntity && (
        <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Assistant Focus</h3>
              <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{formatFocusTitle(snapshot.focusEntity)}</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">{currentView}</span>
          </div>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {snapshot.focusTasks.length > 0
              ? `${snapshot.focusTasks.length} active linked tasks are in scope. Ask for a risk review, next-step plan, summary, or draft communication.`
              : 'No active linked tasks are attached to this record yet. Ask for a summary, planning help, or a draft based on the selected record.'}
          </p>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {quickPrompts.map(prompt => (
          <button
            key={prompt}
            onClick={() => setInput(prompt)}
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 transition-colors hover:border-blue-300 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-blue-500 dark:hover:text-blue-400"
          >
            {prompt}
          </button>
        ))}
      </div>

      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <div className="flex-1 space-y-6 overflow-y-auto p-6">
          {messages.map((message, index) => (
            <div key={index} className={`flex items-start gap-4 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${message.role === 'model' ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400' : 'bg-slate-200 text-slate-600 dark:bg-slate-600 dark:text-slate-200'}`}>
                {message.role === 'model' ? <Sparkles size={16} /> : <div className="text-xs font-bold">You</div>}
              </div>

              <div
                className={`max-w-[80%] rounded-2xl p-4 text-sm leading-relaxed ${
                  message.role === 'user'
                    ? 'rounded-tr-none bg-blue-600 text-white'
                    : 'rounded-tl-none border border-slate-100 bg-slate-50 text-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200'
                }`}
              >
                {message.role === 'model' ? (
                  renderMarkdown(message.text)
                ) : (
                  <div className="space-y-2">
                    {message.text.split('\n').map((line, lineIndex) => (
                      <p key={lineIndex} className="mb-2 last:mb-0">
                        {line}
                      </p>
                    ))}
                  </div>
                )}
                <span className={`mt-2 block text-[10px] opacity-70 ${message.role === 'user' ? 'text-blue-100' : 'text-slate-400'}`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex items-start gap-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400">
                <Sparkles size={16} />
              </div>
              <div className="flex items-center gap-2 rounded-2xl rounded-tl-none border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-300">
                <Loader2 size={16} className="animate-spin" /> Thinking...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-slate-100 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
          {snapshot.urgentTasks.length > 0 && (
            <div className="mb-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Most Urgent Right Now</p>
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                {snapshot.urgentTasks.slice(0, 3).map(task => `${task.title}${task.dueDate ? ` (due ${task.dueDate})` : ''}`).join(' • ')}
              </p>
            </div>
          )}

          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={event => setInput(event.target.value)}
              onKeyDown={event => event.key === 'Enter' && handleSend()}
              placeholder="Ask for a project risk review, weekly plan, draft update, or decision summary..."
              className="flex-1 rounded-xl border border-slate-300 px-4 py-3 shadow-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
            />
            <button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="flex items-center justify-center rounded-xl bg-blue-600 px-6 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 dark:disabled:bg-slate-700"
            >
              <Send size={20} />
            </button>
          </div>
          <div className="mt-2 text-center">
            <span className="text-xs text-slate-400 dark:text-slate-500">AI can make mistakes. Please review generated content.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
