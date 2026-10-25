import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react"

const assetPath = "/assets"

const tools = [
  { label: "Players", icon: "6554e.svg" },
  { label: "Movement", icon: "98154.svg" },
  { label: "Ball", icon: "e41c3.svg" },
  { label: "Phases", icon: "39ca8.svg" },
  { label: "Drawing", icon: "pencil.svg" },
]

const verticalLines = [12.07, 129.21, 460.07, 803.59, 1147.11, 1477.97, 1595.11]
const guideLines = [95.14, 221.6, 725.58, 852.03]
const centerDashes = [319.08, 446.46, 574.77]
const rugbyPositions = [
  "Loosehead",
  "Hooker",
  "Tighthead",
  "Lock",
  "Lock",
  "Flank",
  "Flank",
  "No. 8",
  "Scrum-half",
  "Fly-half",
  "Left wing",
  "Inside centre",
  "Outside centre",
  "Right wing",
  "Full-back",
]

type FormationId = "attack" | "defense"

type PitchCoordinate = {
  x: number
  y: number
}

type BallPlacement = PitchCoordinate & {
  id: "rugby-ball"
}

const defaultBallPosition: BallPlacement = {
  id: "rugby-ball",
  x: 806.0025,
  y: 390,
}

const formationPositions: Record<FormationId, Record<number, PitchCoordinate>> =
  {
    attack: {
      1: { x: 650, y: 360 },
      2: { x: 650, y: 476 },
      3: { x: 650, y: 592 },
      4: { x: 550, y: 400 },
      5: { x: 550, y: 552 },
      6: { x: 450, y: 300 },
      7: { x: 450, y: 652 },
      8: { x: 450, y: 476 },
      9: { x: 750, y: 476 },
      10: { x: 350, y: 476 },
      11: { x: 260, y: 150 },
      12: { x: 340, y: 350 },
      13: { x: 340, y: 602 },
      14: { x: 260, y: 802 },
      15: { x: 170, y: 476 },
    },
    defense: {
      1: { x: 962, y: 345 },
      2: { x: 962, y: 476 },
      3: { x: 962, y: 607 },
      4: { x: 1062, y: 390 },
      5: { x: 1062, y: 562 },
      6: { x: 1162, y: 285 },
      7: { x: 1162, y: 667 },
      8: { x: 1162, y: 476 },
      9: { x: 862, y: 476 },
      10: { x: 1262, y: 476 },
      11: { x: 1352, y: 150 },
      12: { x: 1272, y: 350 },
      13: { x: 1272, y: 602 },
      14: { x: 1352, y: 802 },
      15: { x: 1442, y: 476 },
    },
  }

const playerMarkerStyles: Record<FormationId, {
  fill: string
  number: string
  stroke: string
}> = {
  attack: {
    fill: "#ffffff",
    number: "#2563eb",
    stroke: "#2563eb",
  },
  defense: {
    fill: "#dc2626",
    number: "#ffffff",
    stroke: "#ffffff",
  },
}

const movementActions = [
  { id: "forward", label: "Forward", icon: "55c79.svg" },
  { id: "back", label: "Back", icon: "095b6.svg" },
  { id: "left", label: "Left", icon: "8717b.svg" },
  { id: "right", label: "Right", icon: "505b5.svg" },
  { id: "up-left", label: "Up left", icon: "c2623.svg" },
  { id: "up-right", label: "Up right", icon: "21744.svg" },
  { id: "down-left", label: "Down left", icon: "b49e5.svg" },
  { id: "down-right", label: "Down right", icon: "eeb4c.svg" },
] as const

type MovementDirection = typeof movementActions[number]["id"]

type MovementPlacement = PitchCoordinate & {
  direction: MovementDirection
  id: string
  type: "directional"
}

const movementRotations: Record<MovementDirection, number> = {
  forward: -90,
  back: 90,
  left: 180,
  right: 0,
  "up-left": -135,
  "up-right": -45,
  "down-left": 135,
  "down-right": 45,
}

type PhasePlayData = {
  ball: BallPlacement | null
  movementRoutes: MovementPlacement[]
  playerPositions: Record<string, PlayerPlacement>
}

type PlayerPlacement = {
  formation: FormationId
  id: string
  jerseyNumber: number
  position: string
  x: number
  y: number
}

type Phase = {
  id: string
  name: string
  playData: PhasePlayData
}

type ActivePanel = "players" | "movement" | "ball" | "phases" | null

function createPhase(id: string, name: string): Phase {
  return {
    id,
    name,
    playData: {
      ball: null,
      movementRoutes: [],
      playerPositions: {},
    },
  }
}

type MovementArrowProps = {
  isSelected: boolean
  movement: MovementPlacement
  onSelect: (id: string) => void
}

function MovementArrow({ isSelected, movement, onSelect }: MovementArrowProps) {
  const selectMovement = () => onSelect(movement.id)

  return (
    <g
      aria-label={`${movement.direction} movement arrow`}
      data-movement-id={movement.id}
      onClick={(event) => {
        event.stopPropagation()
        selectMovement()
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          selectMovement()
        }
      }}
      role="button"
      tabIndex={0}
      transform={`translate(${movement.x} ${movement.y}) rotate(${movementRotations[movement.direction]})`}
    >
      {isSelected && (
        <rect
          x="-61"
          y="-32"
          width="122"
          height="64"
          rx="10"
          fill="none"
          stroke="#10b981"
          strokeWidth="4"
          strokeDasharray="9 7"
        />
      )}
      <path
        d="M-53 -8H20V-23L52 0L20 23V8H-53Z"
        fill="#facc15"
        stroke="#111827"
        strokeWidth="5"
        strokeLinejoin="round"
      />
    </g>
  )
}

type RugbyPitchProps = {
  activeMovementDirection: MovementDirection | null
  ball: BallPlacement | null
  movements: MovementPlacement[]
  onMovementPlace: (coordinate: PitchCoordinate) => void
  onMovementSelect: (id: string | null) => void
  players: PlayerPlacement[]
  selectedMovementId: string | null
}

function RugbyPitch({
  activeMovementDirection,
  ball,
  movements,
  onMovementPlace,
  onMovementSelect,
  players,
  selectedMovementId,
}: RugbyPitchProps) {
  const pitchRef = useRef<SVGSVGElement>(null)

  const handlePitchClick = (event: ReactMouseEvent<SVGSVGElement>) => {
    if (!activeMovementDirection) {
      onMovementSelect(null)
      return
    }

    const pitch = pitchRef.current
    const screenMatrix = pitch?.getScreenCTM()
    if (!pitch || !screenMatrix) {
      return
    }

    const point = pitch.createSVGPoint()
    point.x = event.clientX
    point.y = event.clientY
    const pitchPoint = point.matrixTransform(screenMatrix.inverse())

    onMovementPlace({
      x: Math.min(1547, Math.max(65, pitchPoint.x)),
      y: Math.min(887, Math.max(65, pitchPoint.y)),
    })
  }

  return (
    <svg
      aria-label="Rugby pitch"
      className={`pitch${
        activeMovementDirection ? " pitch-placement-mode" : ""
      }`}
      onClick={handlePitchClick}
      preserveAspectRatio="xMidYMid meet"
      ref={pitchRef}
      role="img"
      viewBox="0 0 1612.005 952"
    >
      <rect width="1612.005" height="952" rx="16.892" fill="#00980a" />

      <g fill="#fff">
        <rect x="14.48" y="12.07" width="1583.047" height="4.826" />
        <rect x="14.48" y="935.11" width="1583.047" height="4.826" />
        {verticalLines.map((x) => (
          <rect key={x} x={x} y="14.48" width="4.826" height="923.042" />
        ))}

        {[440.76, 784.28, 1127.81].flatMap((x) =>
          guideLines.map((y) => (
            <rect key={`${x}-${y}`} x={x} y={y} width="43.437" height="4.826" />
          )),
        )}

        {[73.42, 199.88, 703.86, 830.32].map((y) => (
          <rect
            key={`left-stem-${y}`}
            x="213.11"
            y={y}
            width="4.826"
            height="48.264"
          />
        ))}
        {guideLines.map((y) => (
          <rect
            key={`left-arm-${y}`}
            x="215.53"
            y={y}
            width="43.437"
            height="4.826"
          />
        ))}
        {[388.31, 520.31].map((y) => (
          <rect
            key={`left-dash-${y}`}
            x="213.11"
            y={y}
            width="4.826"
            height="46.152"
          />
        ))}

        {[73.42, 199.88, 703.86, 830.32].map((y) => (
          <rect
            key={`right-stem-${y}`}
            x="1394.07"
            y={y}
            width="4.826"
            height="48.264"
          />
        ))}
        {guideLines.map((y) => (
          <rect
            key={`right-arm-${y}`}
            x="1353.04"
            y={y}
            width="43.437"
            height="4.826"
          />
        ))}
        {[388.31, 520.31].map((y) => (
          <rect
            key={`right-dash-${y}`}
            x="1394.07"
            y={y}
            width="4.826"
            height="46.152"
          />
        ))}

        {[71.01, 197.46, 701.45, 827.9].map((y) => (
          <rect
            key={`cross-left-v-${y}`}
            x="683.28"
            y={y}
            width="4.826"
            height="53.09"
          />
        ))}
        {guideLines.map((y) => (
          <rect
            key={`cross-left-h-${y}`}
            x="661.56"
            y={y}
            width="48.264"
            height="4.826"
          />
        ))}
        {centerDashes.map((y) => (
          <rect
            key={`center-left-${y}`}
            x="683.28"
            y={y}
            width="4.826"
            height="61.844"
          />
        ))}

        {[71.01, 197.46, 701.45, 827.9].map((y) => (
          <rect
            key={`cross-right-v-${y}`}
            x="923.9"
            y={y}
            width="4.826"
            height="53.09"
          />
        ))}
        {guideLines.map((y) => (
          <rect
            key={`cross-right-h-${y}`}
            x="902.18"
            y={y}
            width="48.264"
            height="4.826"
          />
        ))}
        {centerDashes.map((y) => (
          <rect
            key={`center-right-${y}`}
            x="923.9"
            y={y}
            width="4.826"
            height="61.844"
          />
        ))}

        <rect x="41.02" y="408.43" width="90.494" height="6.033" />
        <rect x="43.44" y="537.54" width="90.494" height="6.033" />
        <rect x="82.7" y="412.59" width="6.033" height="129.226" />
        <rect x="1480.49" y="408.43" width="90.494" height="6.033" />
        <rect x="1480.49" y="537.54" width="90.494" height="6.033" />
        <rect x="1523.27" y="411.39" width="6.033" height="129.226" />
      </g>

      <rect
        x="14.48"
        y="14.48"
        width="1583.047"
        height="923.042"
        fill="none"
        stroke="#fff"
        strokeWidth="2.413"
      />

      <g aria-label="Placed players">
        {players.map((player) => {
          const markerStyle = playerMarkerStyles[player.formation]

          return (
            <g
              key={player.id}
              aria-label={`${player.formation} ${player.position}`}
            >
              <circle
                cx={player.x}
                cy={player.y}
                fill={markerStyle.fill}
                r="31.97465"
                stroke={markerStyle.stroke}
                strokeWidth="3.61977"
              />
              <text
                x={player.x}
                y={player.y}
                dominantBaseline="central"
                fill={markerStyle.number}
                fontFamily="'Inter:Bold', Inter, sans-serif"
                fontSize="28.958"
                fontWeight="700"
                textAnchor="middle"
              >
                {player.jerseyNumber}
              </text>
            </g>
          )
        })}
      </g>

      {ball && (
        <image
          aria-label="Rugby ball"
          href={`${assetPath}/e4ca3.svg`}
          width="106.18"
          height="67.5691"
          x={ball.x - 53.09}
          y={ball.y - 33.78455}
        />
      )}

      <g aria-label="Movement arrows">
        {movements.map((movement) => (
          <MovementArrow
            isSelected={selectedMovementId === movement.id}
            key={movement.id}
            movement={movement}
            onSelect={(id) => onMovementSelect(id)}
          />
        ))}
      </g>
    </svg>
  )
}

type SidebarProps = {
  activePanel: ActivePanel
  isDrawingActive: boolean
  onDrawingToggle: () => void
  onPanelToggle: (panel: Exclude<ActivePanel, null>) => void
}

function Sidebar({
  activePanel,
  isDrawingActive,
  onDrawingToggle,
  onPanelToggle,
}: SidebarProps) {
  return (
    <nav className="sidebar" aria-label="Play designer tools">
      <div className="menu-label">Menu</div>
      <div className="tool-list">
        {tools.map((tool) => {
          const panel =
            tool.label === "Players"
              ? "players"
              : tool.label === "Movement"
                ? "movement"
                : tool.label === "Ball"
                  ? "ball"
                  : tool.label === "Phases"
                    ? "phases"
                    : null
          const isDrawing = tool.label === "Drawing"

          return (
            <button
              aria-expanded={panel ? activePanel === panel : undefined}
              aria-pressed={
                isDrawing
                  ? isDrawingActive
                  : panel
                    ? activePanel === panel
                    : false
              }
              className={`tool-button${
                isDrawingActive && isDrawing ? " drawing-active" : ""
              }`}
              key={tool.label}
              onClick={
                isDrawing
                  ? onDrawingToggle
                  : panel
                    ? () => onPanelToggle(panel)
                    : undefined
              }
              type="button"
            >
              <span className="tool-icon">
                <img src={`${assetPath}/${tool.icon}`} alt="" />
              </span>
              <span>{tool.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

type PlayerSectionProps = {
  formation: FormationId
  onTogglePlayer: (
    formation: FormationId,
    jerseyNumber: number,
    position: string,
  ) => void
  placedPlayers: Record<string, PlayerPlacement>
  title: string
}

function PlayerSection({
  formation,
  onTogglePlayer,
  placedPlayers,
  title,
}: PlayerSectionProps) {
  return (
    <section className="player-section">
      <div className="player-section-header">
        <h3>{title}</h3>
        <span>15 players</span>
      </div>
      <div className="player-grid">
        {rugbyPositions.map((position, index) => {
          const number = index + 1
          const playerId = `${formation}-${number}`
          const isPlaced = Boolean(placedPlayers[playerId])

          return (
            <button
              aria-pressed={isPlaced}
              className="player-entry"
              key={playerId}
              onClick={() => onTogglePlayer(formation, number, position)}
              type="button"
            >
              <span className="player-number">{number}</span>
              <span className="player-name">
                {number}. {position}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

type ToolPanelProps = {
  children: ReactNode
  icon: string
  onClose: () => void
  title: string
}

function ToolPanel({ children, icon, onClose, title }: ToolPanelProps) {
  return (
    <aside className="tool-panel" aria-label={`${title} panel`}>
      <div className="tool-panel-header">
        <div className="tool-panel-title">
          <span className="tool-panel-icon">
            <img src={`${assetPath}/${icon}`} alt="" />
          </span>
          <h2>{title}</h2>
        </div>
        <button className="panel-close" onClick={onClose} type="button">
          Popout close
        </button>
      </div>
      <div className="tool-panel-content">{children}</div>
    </aside>
  )
}

type PlayersPanelProps = {
  onClose: () => void
  onTogglePlayer: PlayerSectionProps["onTogglePlayer"]
  placedPlayers: Record<string, PlayerPlacement>
}

function PlayersPanel({
  onClose,
  onTogglePlayer,
  placedPlayers,
}: PlayersPanelProps) {
  return (
    <ToolPanel icon="f7617.svg" onClose={onClose} title="Players">
      <>
        <PlayerSection
          formation="attack"
          onTogglePlayer={onTogglePlayer}
          placedPlayers={placedPlayers}
          title="Attack"
        />
        <div className="players-divider" />
        <PlayerSection
          formation="defense"
          onTogglePlayer={onTogglePlayer}
          placedPlayers={placedPlayers}
          title="Defense"
        />
      </>
    </ToolPanel>
  )
}

type MovementPanelProps = {
  activeDirection: MovementDirection | null
  hasSelectedMovement: boolean
  onClose: () => void
  onDirectionSelect: (direction: MovementDirection) => void
  onRemoveSelected: () => void
}

function MovementPanel({
  activeDirection,
  hasSelectedMovement,
  onClose,
  onDirectionSelect,
  onRemoveSelected,
}: MovementPanelProps) {
  return (
    <ToolPanel icon="e3e2d.svg" onClose={onClose} title="Movement">
      <section className="movement-options">
        <div className="movement-section-header">
          <h3>Quick actions</h3>
          <span>8 options</span>
        </div>
        <div className="movement-grid">
          {movementActions.map((action) => (
            <button
              aria-pressed={activeDirection === action.id}
              className="movement-action"
              key={action.id}
              onClick={() => onDirectionSelect(action.id)}
              type="button"
            >
              <span className="movement-action-icon">
                <img src={`${assetPath}/${action.icon}`} alt="" />
              </span>
              <span>{action.label}</span>
            </button>
          ))}
        </div>
        {hasSelectedMovement && (
          <button
            className="remove-movement"
            onClick={onRemoveSelected}
            type="button"
          >
            Remove selected arrow
          </button>
        )}
      </section>
    </ToolPanel>
  )
}

type BallPanelProps = {
  isPlaced: boolean
  onClose: () => void
  onToggleBall: () => void
}

function BallPanel({ isPlaced, onClose, onToggleBall }: BallPanelProps) {
  return (
    <ToolPanel icon="3037f.svg" onClose={onClose} title="Ball">
      <button
        aria-pressed={isPlaced}
        className="ball-option"
        onClick={onToggleBall}
        type="button"
      >
        <span className="ball-option-icon">
          <img src={`${assetPath}/267e0.svg`} alt="" />
        </span>
        <span>Rugby ball</span>
      </button>
    </ToolPanel>
  )
}

type PhasesPanelProps = {
  onAddPhase: () => void
  onClose: () => void
  onRemovePhase: (id: string) => void
  onRenamePhase: (id: string, name: string) => void
  phases: Phase[]
}

function PhasesPanel({
  onAddPhase,
  onClose,
  onRemovePhase,
  onRenamePhase,
  phases,
}: PhasesPanelProps) {
  return (
    <ToolPanel icon="3725d.svg" onClose={onClose} title="Phases">
      <div className="phases-list">
        {phases.map((phase, index) => (
          <section className="phase-card" key={phase.id}>
            <div className="phase-card-header">
              <label htmlFor={`phase-name-${phase.id}`}>
                Phase {index + 1}
              </label>
              <button
                aria-label={`Remove Phase ${index + 1}`}
                className="remove-phase"
                disabled={phases.length === 1}
                onClick={() => onRemovePhase(phase.id)}
                type="button"
              >
                Remove
              </button>
            </div>
            <input
              id={`phase-name-${phase.id}`}
              onChange={(event) => onRenamePhase(phase.id, event.target.value)}
              placeholder={`Phase ${index + 1} name`}
              type="text"
              value={phase.name}
            />
          </section>
        ))}
        <button className="add-phase" onClick={onAddPhase} type="button">
          Add phase
        </button>
      </div>
    </ToolPanel>
  )
}

type PlaybackControlsProps = {
  currentPhaseId: string
  onPhaseChange: (id: string) => void
  phases: Phase[]
}

function PlaybackControls({
  currentPhaseId,
  onPhaseChange,
  phases,
}: PlaybackControlsProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const currentPhaseIndex = Math.max(
    0,
    phases.findIndex((phase) => phase.id === currentPhaseId),
  )

  return (
    <div className="playback" aria-label="Phase playback controls">
      <div className="phase-indicator" aria-live="polite">
        <span className="phase-dot" />
        <span>
          Phase {currentPhaseIndex + 1} of {phases.length}
        </span>
      </div>
      <button
        aria-label="Previous phase"
        className="round-button"
        disabled={currentPhaseIndex === 0}
        onClick={() => onPhaseChange(phases[currentPhaseIndex - 1].id)}
        type="button"
      >
        <img className="previous-icon" src={`${assetPath}/57039.png`} alt="" />
      </button>
      <button
        aria-label={isPlaying ? "Pause play" : "Play phase"}
        aria-pressed={isPlaying}
        className="play-button"
        onClick={() => setIsPlaying((playing) => !playing)}
        type="button"
      >
        <img src={`${assetPath}/92d14.png`} alt="" />
      </button>
      <button
        aria-label="Next phase"
        className="round-button"
        disabled={currentPhaseIndex === phases.length - 1}
        onClick={() => onPhaseChange(phases[currentPhaseIndex + 1].id)}
        type="button"
      >
        <img src={`${assetPath}/57039.png`} alt="" />
      </button>
    </div>
  )
}

export default function App() {
  const [activePanel, setActivePanel] = useState<ActivePanel>(null)
  const [isDrawingActive, setIsDrawingActive] = useState(false)
  const [activeMovementDirection, setActiveMovementDirection] =
    useState<MovementDirection | null>(null)
  const [selectedMovementId, setSelectedMovementId] = useState<string | null>(
    null,
  )
  const [phases, setPhases] = useState<Phase[]>(() => [
    createPhase("phase-1", "Phase 1 name"),
    createPhase("phase-2", "Phase 2 name"),
    createPhase("phase-3", "Phase 3 name"),
  ])
  const [currentPhaseId, setCurrentPhaseId] = useState("phase-1")
  const nextMovementId = useRef(1)
  const nextPhaseId = useRef(4)

  const togglePanel = (panel: Exclude<ActivePanel, null>) => {
    const nextPanel = activePanel === panel ? null : panel
    setActivePanel(nextPanel)
    if (nextPanel !== "movement") {
      setActiveMovementDirection(null)
    }
  }

  const addPhase = () => {
    const phaseId = `phase-${nextPhaseId.current}`
    nextPhaseId.current += 1
    setPhases((current) => [
      ...current,
      createPhase(phaseId, `Phase ${current.length + 1}`),
    ])
  }

  const renamePhase = (id: string, name: string) => {
    setPhases((current) =>
      current.map((phase) => (phase.id === id ? { ...phase, name } : phase)),
    )
  }

  const removePhase = (id: string) => {
    if (phases.length === 1) {
      return
    }

    const removedIndex = phases.findIndex((phase) => phase.id === id)
    if (removedIndex === -1) {
      return
    }

    const remainingPhases = phases.filter((phase) => phase.id !== id)
    if (currentPhaseId === id) {
      const nextIndex = Math.min(removedIndex, remainingPhases.length - 1)
      setCurrentPhaseId(remainingPhases[nextIndex].id)
      setActiveMovementDirection(null)
      setSelectedMovementId(null)
    }
    setPhases(remainingPhases)
  }

  const togglePlayer = (
    formation: FormationId,
    jerseyNumber: number,
    position: string,
  ) => {
    const playerId = `${formation}-${jerseyNumber}`
    const coordinate = formationPositions[formation][jerseyNumber]

    setPhases((current) =>
      current.map((phase) => {
        if (phase.id !== currentPhaseId) {
          return phase
        }

        const existingPlacement = phase.playData.playerPositions[playerId]
        if (existingPlacement) {
          const { [playerId]: removedPlayer, ...remainingPlayers } =
            phase.playData.playerPositions
          void removedPlayer

          return {
            ...phase,
            playData: {
              ...phase.playData,
              playerPositions: remainingPlayers,
            },
          }
        }

        const placement: PlayerPlacement = {
          formation,
          id: playerId,
          jerseyNumber,
          position,
          ...coordinate,
        }

        return {
          ...phase,
          playData: {
            ...phase.playData,
            playerPositions: {
              ...phase.playData.playerPositions,
              [playerId]: placement,
            },
          },
        }
      }),
    )
  }

  const toggleBall = () => {
    setPhases((current) =>
      current.map((phase) =>
        phase.id === currentPhaseId
          ? {
              ...phase,
              playData: {
                ...phase.playData,
                ball: phase.playData.ball ? null : { ...defaultBallPosition },
              },
            }
          : phase,
      ),
    )
  }

  const selectMovementDirection = (direction: MovementDirection) => {
    setActiveMovementDirection((current) =>
      current === direction ? null : direction,
    )
    setSelectedMovementId(null)
  }

  const placeMovement = (coordinate: PitchCoordinate) => {
    if (!activeMovementDirection) {
      return
    }

    const movement: MovementPlacement = {
      ...coordinate,
      direction: activeMovementDirection,
      id: `movement-${nextMovementId.current}`,
      type: "directional",
    }
    nextMovementId.current += 1

    setPhases((current) =>
      current.map((phase) =>
        phase.id === currentPhaseId
          ? {
              ...phase,
              playData: {
                ...phase.playData,
                movementRoutes: [...phase.playData.movementRoutes, movement],
              },
            }
          : phase,
      ),
    )
    setSelectedMovementId(movement.id)
    setActiveMovementDirection(null)
  }

  const removeSelectedMovement = () => {
    if (!selectedMovementId) {
      return
    }

    setPhases((current) =>
      current.map((phase) =>
        phase.id === currentPhaseId
          ? {
              ...phase,
              playData: {
                ...phase.playData,
                movementRoutes: phase.playData.movementRoutes.filter(
                  (movement) => movement.id !== selectedMovementId,
                ),
              },
            }
          : phase,
      ),
    )
    setSelectedMovementId(null)
  }

  useEffect(() => {
    if (!selectedMovementId) {
      return
    }

    const handleDeleteKey = (event: KeyboardEvent) => {
      const target = event.target as Element | null
      if (
        target?.closest(
          "input, textarea, select, [contenteditable='true'], [contenteditable='']",
        )
      ) {
        return
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault()
        setPhases((current) =>
          current.map((phase) =>
            phase.id === currentPhaseId
              ? {
                  ...phase,
                  playData: {
                    ...phase.playData,
                    movementRoutes: phase.playData.movementRoutes.filter(
                      (movement) => movement.id !== selectedMovementId,
                    ),
                  },
                }
              : phase,
          ),
        )
        setSelectedMovementId(null)
      }
    }

    window.addEventListener("keydown", handleDeleteKey)
    return () => window.removeEventListener("keydown", handleDeleteKey)
  }, [currentPhaseId, selectedMovementId])

  const changePhase = (id: string) => {
    setCurrentPhaseId(id)
    setActiveMovementDirection(null)
    setSelectedMovementId(null)
  }

  const currentPhase =
    phases.find((phase) => phase.id === currentPhaseId) ?? phases[0]

  return (
    <main className="app-shell">
      <Sidebar
        activePanel={activePanel}
        isDrawingActive={isDrawingActive}
        onDrawingToggle={() => setIsDrawingActive((current) => !current)}
        onPanelToggle={togglePanel}
      />
      <section className="main-content">
        <div className="field-area">
          <RugbyPitch
            activeMovementDirection={activeMovementDirection}
            ball={currentPhase.playData.ball}
            movements={currentPhase.playData.movementRoutes}
            onMovementPlace={placeMovement}
            onMovementSelect={(id) => {
              setSelectedMovementId(id)
              if (id) {
                setActiveMovementDirection(null)
              }
            }}
            players={Object.values(currentPhase.playData.playerPositions)}
            selectedMovementId={selectedMovementId}
          />
        </div>
        <footer className="bottom-bar">
          <PlaybackControls
            currentPhaseId={currentPhaseId}
            onPhaseChange={changePhase}
            phases={phases}
          />
        </footer>
      </section>
      {activePanel === "players" && (
        <PlayersPanel
          onClose={() => setActivePanel(null)}
          onTogglePlayer={togglePlayer}
          placedPlayers={currentPhase.playData.playerPositions}
        />
      )}
      {activePanel === "movement" && (
        <MovementPanel
          activeDirection={activeMovementDirection}
          hasSelectedMovement={Boolean(selectedMovementId)}
          onClose={() => {
            setActiveMovementDirection(null)
            setActivePanel(null)
          }}
          onDirectionSelect={selectMovementDirection}
          onRemoveSelected={removeSelectedMovement}
        />
      )}
      {activePanel === "ball" && (
        <BallPanel
          isPlaced={Boolean(currentPhase.playData.ball)}
          onClose={() => setActivePanel(null)}
          onToggleBall={toggleBall}
        />
      )}
      {activePanel === "phases" && (
        <PhasesPanel
          onAddPhase={addPhase}
          onClose={() => setActivePanel(null)}
          onRemovePhase={removePhase}
          onRenamePhase={renamePhase}
          phases={phases}
        />
      )}
    </main>
  )
}
