import HamburgerMenu from './HamburgerMenu'

interface ToolbarProps {
  onAddTerminal: () => void
  onAddWidget: () => void
}

export default function Toolbar({ onAddTerminal, onAddWidget }: ToolbarProps) {
  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <HamburgerMenu />
        <button className="toolbar-btn" onClick={onAddTerminal}>+ terminal</button>
        <button className="toolbar-btn" onClick={onAddWidget}>+ widget</button>
      </div>
      <div className="toolbar-right">
        <button
          className="wc-btn wc-minimize"
          onClick={() => window.electronAPI.window.minimize()}
          aria-label="Minimize"
        />
        <button
          className="wc-btn wc-maximize"
          onClick={() => window.electronAPI.window.maximize()}
          aria-label="Maximize"
        />
        <button
          className="wc-btn wc-close"
          onClick={() => window.electronAPI.window.close()}
          aria-label="Close"
        />
      </div>
    </div>
  )
}
