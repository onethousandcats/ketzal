import type { WidgetType } from '../types'
import WeatherWidget from './WeatherWidget'
import PomodoroWidget from './PomodoroWidget'
import TodoWidget from './TodoWidget'
import MatrixWidget from './MatrixWidget'
import StatsWidget from './StatsWidget'

interface WidgetPaneProps {
  widgetType: WidgetType
}

export default function WidgetPane({ widgetType }: WidgetPaneProps) {
  return (
    <div className="widget-pane">
      {widgetType === 'weather'  && <WeatherWidget />}
      {widgetType === 'pomodoro' && <PomodoroWidget />}
      {widgetType === 'todo'     && <TodoWidget />}
      {widgetType === 'matrix'   && <MatrixWidget />}
      {widgetType === 'stats'    && <StatsWidget />}
    </div>
  )
}
