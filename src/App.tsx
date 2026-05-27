import { useState, useCallback } from 'react'
import {
  Mosaic,
  MosaicWindow,
  type MosaicNode,
  type MosaicBranch
} from 'react-mosaic-component'
import 'react-mosaic-component/react-mosaic-component.css'

import { ThemeProvider } from './components/ThemeProvider'
import Toolbar from './components/Toolbar'
import TerminalPane from './components/TerminalPane'
import WidgetPane from './components/WidgetPane'
import type { WidgetType } from './types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PaneType = 'terminal' | 'widget'

interface PaneConfig {
  id: string
  type: PaneType
  title: string
  widgetType?: WidgetType
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Collect all leaf (string) node IDs from a mosaic tree. */
function getLeaves(node: MosaicNode<string>): string[] {
  if (typeof node === 'string') return [node]
  return [...getLeaves(node.first), ...getLeaves(node.second)]
}

/** Remove a specific leaf from the mosaic tree. Returns null if the tree becomes empty. */
function removeLeaf(
  node: MosaicNode<string>,
  id: string
): MosaicNode<string> | null {
  if (typeof node === 'string') return node === id ? null : node
  const newFirst = removeLeaf(node.first, id)
  const newSecond = removeLeaf(node.second, id)
  if (!newFirst && !newSecond) return null
  if (!newFirst) return newSecond
  if (!newSecond) return newFirst
  return { ...node, first: newFirst, second: newSecond }
}

// ---------------------------------------------------------------------------
// Counter kept outside state to avoid stale closures in createNode callbacks
// ---------------------------------------------------------------------------

let _idCounter = 0
const nextId = () => `pane_${++_idCounter}`

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export default function App() {
  const [layout, setLayout] = useState<MosaicNode<string> | null>(null)
  const [panes, setPanes] = useState<Map<string, PaneConfig>>(new Map())

  // ----- Add a new pane to the layout -----
  const addPane = useCallback((type: PaneType, widgetType?: WidgetType) => {
    const id = nextId()
    const title = type === 'terminal' ? 'terminal' : (widgetType ?? 'weather')

    setPanes((prev) => new Map(prev).set(id, { id, type, title, widgetType }))
    setLayout((prev) => {
      if (prev === null) return id
      return {
        direction: 'row',
        first: prev,
        second: id,
        splitPercentage: type === 'terminal' ? 50 : 70
      }
    })
  }, [])

  const addTerminal = useCallback(() => addPane('terminal'), [addPane])
  const addWidget = useCallback((wt: WidgetType) => addPane('widget', wt), [addPane])

  // ----- Update pane title (from terminal OSC sequences) -----
  const updatePaneTitle = useCallback((id: string, title: string) => {
    setPanes((prev) => {
      const pane = prev.get(id)
      if (!pane || pane.title === title) return prev
      return new Map(prev).set(id, { ...pane, title })
    })
  }, [])

  // ----- Remove a pane (called from close button inside MosaicWindow) -----
  const removePane = useCallback((id: string) => {
    setPanes((prev) => {
      const next = new Map(prev)
      next.delete(id)
      return next
    })
    setLayout((prev) => {
      if (!prev) return null
      return removeLeaf(prev, id)
    })
  }, [])

  // ----- Handle mosaic layout changes (drag/resize/external removes) -----
  const handleChange = useCallback(
    (newLayout: MosaicNode<string> | null) => {
      if (newLayout !== null) {
        // Prune panes that are no longer in the layout tree
        const activeIds = new Set(getLeaves(newLayout))
        setPanes((prev) => {
          let changed = false
          const next = new Map(prev)
          for (const id of prev.keys()) {
            if (!activeIds.has(id)) {
              next.delete(id)
              changed = true
            }
          }
          return changed ? next : prev
        })
      } else {
        setPanes(new Map())
      }
      setLayout(newLayout)
    },
    []
  )

  // ----- Render each tile -----
  const renderTile = useCallback(
    (id: string, path: MosaicBranch[]): JSX.Element => {
      const pane = panes.get(id)
      if (!pane) return <div style={{ background: 'var(--bg-panel)' }} />

      return (
        <MosaicWindow<string>
          path={path}
          title={pane.title}
          // createNode is required by react-mosaic even if we override controls
          createNode={() => {
            const newId = nextId()
            const newPane: PaneConfig = {
              id: newId,
              type: pane.type,
              title: pane.type === 'terminal' ? 'terminal' : (pane.widgetType ?? 'weather'),
              widgetType: pane.widgetType
            }
            setPanes((prev) => new Map(prev).set(newId, newPane))
            return newId
          }}
          renderToolbar={() => (
            <div className="pane-header">
              <button
                className="pane-close"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => removePane(id)}
                aria-label={`Close ${pane.title}`}
              />
              <span className="pane-title">{pane.title}</span>
            </div>
          )}
        >
          {pane.type === 'terminal' ? (
            <TerminalPane paneId={id} onTitleChange={(t) => updatePaneTitle(id, t)} />
          ) : (
            <WidgetPane widgetType={pane.widgetType ?? 'weather'} />
          )}
        </MosaicWindow>
      )
    },
    [panes, removePane, updatePaneTitle]
  )

  return (
    <ThemeProvider>
      <div className="app-container">
        <Toolbar onAddTerminal={addTerminal} onAddWidget={addWidget} />

        <div className="mosaic-container">
          {layout === null ? (
            <div className="empty-state">
              <span className="empty-state-title">Ketzal</span>
              <span className="empty-state-hint">
                Click <strong>+ Terminal</strong> or <strong>+ Widget</strong> to get started
              </span>
            </div>
          ) : (
            <Mosaic<string>
              renderTile={renderTile}
              value={layout}
              onChange={handleChange}
            />
          )}
        </div>
      </div>
    </ThemeProvider>
  )
}
