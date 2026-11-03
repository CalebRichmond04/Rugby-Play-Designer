import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
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

const playablePitchBounds = {
  minX: 65,
  maxX: 1547,
  minY: 65,
  maxY: 887,
}

const playerBallDropRadius = 44

function clampToPlayablePitch({ x, y }: PitchCoordinate): PitchCoordinate {
  return {
    x: Math.min(
      playablePitchBounds.maxX,
      Math.max(playablePitchBounds.minX, x),
    ),
    y: Math.min(
      playablePitchBounds.maxY,
      Math.max(playablePitchBounds.minY, y),
    ),
  }
}

type PopupExclusionBounds = {
  maxX: number
  maxY: number
  minX: number
  minY: number
}

function getPopupExclusionBounds(
  points: PitchCoordinate[],
  padding = 0,
): PopupExclusionBounds {
  return {
    maxX: Math.max(...points.map((point) => point.x)) + padding,
    maxY: Math.max(...points.map((point) => point.y)) + padding,
    minX: Math.min(...points.map((point) => point.x)) - padding,
    minY: Math.min(...points.map((point) => point.y)) - padding,
  }
}

function getContextPopupPosition(
  bounds: PopupExclusionBounds,
  width: number,
  height: number,
  gap = 16,
) {
  const spaces = [
    {
      available: playablePitchBounds.maxX - bounds.maxX - gap,
      needed: width,
      side: "right",
    },
    {
      available: bounds.minX - playablePitchBounds.minX - gap,
      needed: width,
      side: "left",
    },
    {
      available: bounds.minY - playablePitchBounds.minY - gap,
      needed: height,
      side: "top",
    },
    {
      available: playablePitchBounds.maxY - bounds.maxY - gap,
      needed: height,
      side: "bottom",
    },
  ] as const
  const fittingSides = spaces.filter((space) => space.available >= space.needed)
  const side = [...(fittingSides.length > 0 ? fittingSides : spaces)].sort(
    (a, b) => b.available - a.available,
  )[0].side
  const centerX = (bounds.minX + bounds.maxX) / 2
  const centerY = (bounds.minY + bounds.maxY) / 2
  const preferredPosition =
    side === "right"
      ? { x: bounds.maxX + gap, y: centerY - height / 2 }
      : side === "left"
        ? { x: bounds.minX - gap - width, y: centerY - height / 2 }
        : side === "top"
          ? { x: centerX - width / 2, y: bounds.minY - gap - height }
          : { x: centerX - width / 2, y: bounds.maxY + gap }

  return {
    x: Math.min(
      playablePitchBounds.maxX - width,
      Math.max(playablePitchBounds.minX, preferredPosition.x),
    ),
    y: Math.min(
      playablePitchBounds.maxY - height,
      Math.max(playablePitchBounds.minY, preferredPosition.y),
    ),
  }
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

const teamArrowStyles: Record<FormationId, { color: string }> = {
  attack: { color: "#2563eb" },
  defense: { color: "#dc2626" },
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
  end: PitchCoordinate
  id: string
  start: PitchCoordinate
  type: "directional"
}

type PlayerMovement = {
  controlPoints: PitchCoordinate[]
  destination: PitchCoordinate
  id: string
  playerId: string
  start: PitchCoordinate
}

type PassAction = {
  id: string
  originPlayerId: string
  receiverPlayerId: string
  type: "pass"
}

type KickAction = {
  destination: PitchCoordinate
  id: string
  originPlayerId: string
  type: "kick"
}

type BallAction = PassAction | KickAction

function cloneBallAction(action: BallAction): BallAction {
  return action.type === "pass"
    ? { ...action }
    : { ...action, destination: { ...action.destination } }
}

type BallActionTargeting = {
  actionId: string | null
  originPlayerId: string
  type: BallAction["type"]
}

function clonePlayerMovement(movement: PlayerMovement): PlayerMovement {
  return {
    ...movement,
    controlPoints: movement.controlPoints.map((point) => ({ ...point })),
    destination: { ...movement.destination },
    start: { ...movement.start },
  }
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

function getDirectionalArrowEndpoints(
  movement: MovementPlacement,
): { end: PitchCoordinate start: PitchCoordinate } {
  if (movement.end && movement.start) {
    return { end: movement.end, start: movement.start }
  }

  const rotation = (movementRotations[movement.direction] * Math.PI) / 180
  return {
    end: {
      x: movement.x + 52 * Math.cos(rotation),
      y: movement.y + 52 * Math.sin(rotation),
    },
    start: {
      x: movement.x - 53 * Math.cos(rotation),
      y: movement.y - 53 * Math.sin(rotation),
    },
  }
}

function createDirectionalArrowPlacement(
  coordinate: PitchCoordinate,
  direction: MovementDirection,
) {
  const rotation = (movementRotations[direction] * Math.PI) / 180
  const start = {
    x: coordinate.x - 53 * Math.cos(rotation),
    y: coordinate.y - 53 * Math.sin(rotation),
  }
  const end = {
    x: coordinate.x + 52 * Math.cos(rotation),
    y: coordinate.y + 52 * Math.sin(rotation),
  }
  const minX = Math.min(start.x, end.x)
  const maxX = Math.max(start.x, end.x)
  const minY = Math.min(start.y, end.y)
  const maxY = Math.max(start.y, end.y)
  const shiftX =
    minX < playablePitchBounds.minX
      ? playablePitchBounds.minX - minX
      : maxX > playablePitchBounds.maxX
        ? playablePitchBounds.maxX - maxX
        : 0
  const shiftY =
    minY < playablePitchBounds.minY
      ? playablePitchBounds.minY - minY
      : maxY > playablePitchBounds.maxY
        ? playablePitchBounds.maxY - maxY
        : 0

  return {
    end: { x: end.x + shiftX, y: end.y + shiftY },
    start: { x: start.x + shiftX, y: start.y + shiftY },
    x: coordinate.x + shiftX,
    y: coordinate.y + shiftY,
  }
}

type PhasePlayData = {
  ball: BallPlacement | null
  ballActions: BallAction[]
  ballPossessionPlayerId: string | null
  movementRoutes: MovementPlacement[]
  playerMovements: Record<string, PlayerMovement>
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
      ballActions: [],
      ballPossessionPlayerId: null,
      movementRoutes: [],
      playerMovements: {},
      playerPositions: {},
    },
  }
}

type PlayerMovementArrowProps = {
  formation: FormationId
  isSelected: boolean
  movement: PlayerMovement
  onControlDragStart: (
    event: ReactPointerEvent<SVGCircleElement>,
    movement: PlayerMovement,
    controlPointIndex: number,
    coordinate: PitchCoordinate,
  ) => void
  onDestinationDragStart: (
    event: ReactPointerEvent<SVGCircleElement>,
    movement: PlayerMovement,
  ) => void
  onSelect: (movementId: string) => void
}

function getPlayerMovementPath(movement: PlayerMovement) {
  const { controlPoints, destination, start } = movement
  if (controlPoints.length >= 2) {
    return `M ${start.x} ${start.y} C ${controlPoints[0].x} ${controlPoints[0].y} ${controlPoints[1].x} ${controlPoints[1].y} ${destination.x} ${destination.y}`
  }
  if (controlPoints.length === 1) {
    return `M ${start.x} ${start.y} Q ${controlPoints[0].x} ${controlPoints[0].y} ${destination.x} ${destination.y}`
  }
  return `M ${start.x} ${start.y} L ${destination.x} ${destination.y}`
}

function PlayerMovementArrow({
  formation,
  isSelected,
  movement,
  onControlDragStart,
  onDestinationDragStart,
  onSelect,
}: PlayerMovementArrowProps) {
  const arrowStyle = teamArrowStyles[formation]
  const selectMovement = () => onSelect(movement.id)
  const editableControlPoints =
    movement.controlPoints.length > 0
      ? movement.controlPoints
      : [
          {
            x: (movement.start.x + movement.destination.x) / 2,
            y: (movement.start.y + movement.destination.y) / 2,
          },
        ]
  const path = getPlayerMovementPath(movement)

  return (
    <g
      aria-label={`Planned movement for ${movement.playerId}`}
      data-player-movement-id={movement.id}
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
      onPointerDown={(event) => event.stopPropagation()}
      role="button"
      tabIndex={0}
    >
      {isSelected && (
        <path
          d={path}
          fill="none"
          stroke={arrowStyle.color}
          strokeDasharray="14 10"
          strokeLinecap="round"
          strokeWidth="16"
          opacity="0.35"
        />
      )}
      <path
        d={path}
        fill="none"
        markerEnd={`url(#${formation}-movement-arrowhead)`}
        stroke={arrowStyle.color}
        strokeDasharray="14 10"
        strokeLinecap="round"
        strokeWidth="8"
      />
      {isSelected && (
        <>
          <polyline
            fill="none"
            points={[
              movement.start,
              ...editableControlPoints,
              movement.destination,
            ]
              .map((point) => `${point.x},${point.y}`)
              .join(" ")}
            stroke={arrowStyle.color}
            strokeDasharray="5 6"
            strokeWidth="3"
            opacity="0.7"
          />
          <circle
            cx={movement.start.x}
            cy={movement.start.y}
            fill={arrowStyle.color}
            r="10"
            stroke="#f9fafb"
            strokeWidth="3"
          />
          <circle
            cx={movement.destination.x}
            cy={movement.destination.y}
            className="arrow-endpoint-control"
            data-endpoint="destination"
            fill={arrowStyle.color}
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => onDestinationDragStart(event, movement)}
            r="10"
            stroke="#f9fafb"
            strokeWidth="3"
          />
          {editableControlPoints.map((controlPoint, index) => (
            <circle
              aria-label={`Curve control point ${index + 1}`}
              className="player-movement-control"
              cx={controlPoint.x}
              cy={controlPoint.y}
              data-control-point-index={index}
              fill="#f9fafb"
              key={`${movement.id}-control-${index}`}
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) =>
                onControlDragStart(event, movement, index, controlPoint)
              }
              r="14"
              stroke={arrowStyle.color}
              strokeWidth="5"
            />
          ))}
        </>
      )}
    </g>
  )
}

type BallActionArrowProps = {
  action: BallAction
  endpoint: PitchCoordinate
  formation: FormationId
  isSelected: boolean
  onEndpointDragStart: (
    event: ReactPointerEvent<SVGCircleElement>,
    action: BallAction,
    endpoint: PitchCoordinate,
  ) => void
  onSelect: (actionId: string) => void
  origin: PitchCoordinate
}

function BallActionArrow({
  action,
  endpoint,
  formation,
  isSelected,
  onEndpointDragStart,
  onSelect,
  origin,
}: BallActionArrowProps) {
  const path = `M ${origin.x} ${origin.y} L ${endpoint.x} ${endpoint.y}`
  const isPass = action.type === "pass"
  const arrowStyle = teamArrowStyles[formation]

  return (
    <g
      aria-label={`${isPass ? "Pass" : "Kick"} route`}
      data-ball-action-id={action.id}
      onClick={(event) => {
        event.stopPropagation()
        onSelect(action.id)
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          onSelect(action.id)
        }
      }}
      onPointerDown={(event) => event.stopPropagation()}
      role="button"
      tabIndex={0}
    >
      {isSelected && (
        <path
          d={path}
          fill="none"
          stroke={arrowStyle.color}
          strokeDasharray={isPass ? "1 12" : undefined}
          strokeLinecap="round"
          strokeWidth="16"
          opacity="0.35"
        />
      )}
      <path
        d={path}
        fill="none"
        markerEnd={`url(#${formation}-${action.type}-arrowhead)`}
        stroke={arrowStyle.color}
        strokeDasharray={isPass ? "1 12" : undefined}
        strokeLinecap="round"
        strokeWidth="8"
      />
      {isSelected && (
        <>
          <circle
            cx={origin.x}
            cy={origin.y}
            fill={arrowStyle.color}
            pointerEvents="none"
            r="10"
            stroke="#f9fafb"
            strokeWidth="3"
          />
          <circle
            className="arrow-endpoint-control"
            cx={endpoint.x}
            cy={endpoint.y}
            data-endpoint="destination"
            fill={arrowStyle.color}
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) =>
              onEndpointDragStart(event, action, endpoint)
            }
            r="12"
            stroke="#f9fafb"
            strokeWidth="4"
          />
        </>
      )}
    </g>
  )
}

type BallActionEditorProps = {
  action: BallAction
  endpoint: PitchCoordinate
  onCancel: () => void
  onEdit: () => void
  onRemove: () => void
  origin: PitchCoordinate
}

function BallActionEditor({
  action,
  endpoint,
  onCancel,
  onEdit,
  onRemove,
  origin,
}: BallActionEditorProps) {
  const width = 270
  const height = 92
  const { x, y } = getContextPopupPosition(
    getPopupExclusionBounds([origin, endpoint], 12),
    width,
    height,
    18,
  )

  return (
    <foreignObject
      aria-label={`Edit ${action.type} route`}
      height={height}
      width={width}
      x={x}
      y={y}
    >
      <div
        className="player-movement-editor ball-action-editor"
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="player-context-heading">
          {action.type === "pass" ? "Pass route" : "Kick route"}
        </div>
        <div className="player-movement-editor-actions">
          <button
            className="player-context-action"
            onClick={onEdit}
            type="button"
          >
            Edit
          </button>
          <button
            className="player-context-action player-context-action-danger"
            onClick={onRemove}
            type="button"
          >
            Remove
          </button>
          <button
            className="player-context-cancel"
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
        </div>
      </div>
    </foreignObject>
  )
}

type MovementArrowProps = {
  draggingEndpoint: "end" | "start" | null
  isDragging: boolean
  isSelected: boolean
  movement: MovementPlacement
  onDragStart: (
    event: ReactPointerEvent<SVGGElement>,
    movement: MovementPlacement,
  ) => void
  onEndpointDragStart: (
    event: ReactPointerEvent<SVGCircleElement>,
    movement: MovementPlacement,
    endpoint: "end" | "start",
  ) => void
  onSelect: (id: string) => void
}

function MovementArrow({
  draggingEndpoint,
  isDragging,
  isSelected,
  movement,
  onDragStart,
  onEndpointDragStart,
  onSelect,
}: MovementArrowProps) {
  const selectMovement = () => onSelect(movement.id)
  const { end, start } = getDirectionalArrowEndpoints(movement)
  const deltaX = end.x - start.x
  const deltaY = end.y - start.y
  const length = Math.max(1, Math.hypot(deltaX, deltaY))
  const angle = (Math.atan2(deltaY, deltaX) * 180) / Math.PI
  const startX = -length / 2
  const endX = length / 2
  const arrowheadLength = Math.min(32, Math.max(16, length * 0.35))
  const arrowheadBase = endX - arrowheadLength
  const centerX = (start.x + end.x) / 2
  const centerY = (start.y + end.y) / 2

  return (
    <g
      aria-label={`${movement.direction} movement arrow`}
      data-dragging={isDragging}
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
      onPointerDown={(event) => onDragStart(event, movement)}
      role="button"
      tabIndex={0}
      transform={`translate(${centerX} ${centerY}) rotate(${angle})`}
    >
      {isSelected && (
        <rect
          x={startX - 8}
          y="-32"
          width={length + 16}
          height="64"
          rx="10"
          fill="none"
          stroke="#10b981"
          strokeWidth="4"
          strokeDasharray="9 7"
        />
      )}
      <path
        d={`M ${startX} -8 H ${arrowheadBase} V -23 L ${endX} 0 L ${arrowheadBase} 23 V 8 H ${startX} Z`}
        fill="#facc15"
        stroke="#111827"
        strokeWidth="5"
        strokeLinejoin="round"
      />
      {isSelected && (
        <>
          <circle
            className="arrow-endpoint-control"
            cx={startX}
            cy="0"
            data-endpoint="start"
            fill="#facc15"
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) =>
              onEndpointDragStart(event, movement, "start")
            }
            r={draggingEndpoint === "start" ? 13 : 10}
            stroke={draggingEndpoint === "start" ? "#10b981" : "#f9fafb"}
            strokeWidth={draggingEndpoint === "start" ? 5 : 3}
          />
          <circle
            className="arrow-endpoint-control"
            cx={endX}
            cy="0"
            data-endpoint="end"
            fill="#facc15"
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) =>
              onEndpointDragStart(event, movement, "end")
            }
            r={draggingEndpoint === "end" ? 13 : 10}
            stroke={draggingEndpoint === "end" ? "#10b981" : "#f9fafb"}
            strokeWidth={draggingEndpoint === "end" ? 5 : 3}
          />
        </>
      )}
    </g>
  )
}

type IndependentMovementEditorProps = {
  movement: MovementPlacement
  onCancel: () => void
  onFinish: () => void
}

function IndependentMovementEditor({
  movement,
  onCancel,
  onFinish,
}: IndependentMovementEditorProps) {
  const width = 190
  const height = 92
  const endpoints = getDirectionalArrowEndpoints(movement)
  const { x, y } = getContextPopupPosition(
    getPopupExclusionBounds([endpoints.start, endpoints.end], 14),
    width,
    height,
    18,
  )

  return (
    <foreignObject
      aria-label="Edit independent movement arrow"
      height={height}
      width={width}
      x={x}
      y={y}
    >
      <div
        className="player-movement-editor"
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="player-context-heading">Movement arrow</div>
        <div className="player-movement-editor-actions">
          <button
            className="player-context-action"
            onClick={onFinish}
            type="button"
          >
            Done
          </button>
          <button
            className="player-context-cancel"
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
        </div>
      </div>
    </foreignObject>
  )
}

type PlayerContextMenuProps = {
  hasMovement: boolean
  hasPossession: boolean
  onCancel: () => void
  onKick: () => void
  onMove: () => void
  onPass: () => void
  onReleaseBall: () => void
  onRemoveMovement: () => void
  player: PlayerPlacement
  targetingMode: "kick" | "move" | "pass" | null
}

function PlayerContextMenu({
  hasMovement,
  hasPossession,
  onCancel,
  onKick,
  onMove,
  onPass,
  onReleaseBall,
  onRemoveMovement,
  player,
  targetingMode,
}: PlayerContextMenuProps) {
  const width = 224
  const height = targetingMode
    ? 112
    : (hasMovement ? 176 : 136) + (hasPossession ? 120 : 0)
  const { x, y } = getContextPopupPosition(
    getPopupExclusionBounds([player], 44),
    width,
    height,
    12,
  )
  const movementContextActions = hasMovement
    ? [
        {
          className: "player-context-action",
          label: "Edit Movement",
          onClick: onMove,
        },
        {
          className: "player-context-action player-context-action-danger",
          label: "Remove Movement",
          onClick: onRemoveMovement,
        },
      ]
    : [
        {
          className: "player-context-action",
          label: "Move",
          onClick: onMove,
        },
      ]
  const actions = hasPossession
    ? [
        ...movementContextActions,
        {
          className: "player-context-action player-context-action-pass",
          label: "Pass",
          onClick: onPass,
        },
        {
          className: "player-context-action player-context-action-kick",
          label: "Kick",
          onClick: onKick,
        },
        {
          className: "player-context-action player-context-action-ball",
          label: "Release Ball",
          onClick: onReleaseBall,
        },
      ]
    : movementContextActions

  return (
    <foreignObject
      aria-label={`Actions for player ${player.jerseyNumber}`}
      height={height}
      width={width}
      x={x}
      y={y}
    >
      <div
        className="player-context-menu"
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="player-context-heading">
          Player {player.jerseyNumber}
        </div>
        {targetingMode ? (
          <>
            <div className="player-context-hint">
              {targetingMode === "pass"
                ? "Select a teammate"
                : "Choose a destination"}
            </div>
            <button
              className="player-context-cancel"
              onClick={onCancel}
              type="button"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <div className="player-context-actions">
              {actions.map((action) => (
                <button
                  className={action.className}
                  key={action.label}
                  onClick={action.onClick}
                  type="button"
                >
                  {action.label}
                </button>
              ))}
            </div>
            <button
              className="player-context-cancel"
              onClick={onCancel}
              type="button"
            >
              Cancel
            </button>
          </>
        )}
      </div>
    </foreignObject>
  )
}

type PlayerMovementEditorProps = {
  movement: PlayerMovement
  onCancel: () => void
  onFinish: () => void
  onStraighten: () => void
  playerNumber: number
}

function PlayerMovementEditor({
  movement,
  onCancel,
  onFinish,
  onStraighten,
  playerNumber,
}: PlayerMovementEditorProps) {
  const width = 286
  const height = 92
  const controlPoints =
    movement.controlPoints.length > 0
      ? movement.controlPoints
      : [
          {
            x: (movement.start.x + movement.destination.x) / 2,
            y: (movement.start.y + movement.destination.y) / 2,
          },
        ]
  const { x, y } = getContextPopupPosition(
    getPopupExclusionBounds(
      [movement.start, ...controlPoints, movement.destination],
      16,
    ),
    width,
    height,
    18,
  )

  return (
    <foreignObject
      aria-label={`Edit movement for player ${playerNumber}`}
      height={height}
      width={width}
      x={x}
      y={y}
    >
      <div
        className="player-movement-editor"
        onClick={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="player-context-heading">
          Player {playerNumber} movement
        </div>
        <div className="player-movement-editor-actions">
          <button
            className="player-context-action"
            onClick={onFinish}
            type="button"
          >
            Done
          </button>
          <button
            className="player-context-cancel"
            disabled={movement.controlPoints.length === 0}
            onClick={onStraighten}
            type="button"
          >
            Straight
          </button>
          <button
            className="player-context-cancel"
            onClick={onCancel}
            type="button"
          >
            Cancel
          </button>
        </div>
      </div>
    </foreignObject>
  )
}

type RugbyPitchProps = {
  activeMovementDirection: MovementDirection | null
  ball: BallPlacement | null
  ballActions: BallAction[]
  ballActionTargeting: BallActionTargeting | null
  ballPossessionPlayerId: string | null
  isBallSelected: boolean
  movements: MovementPlacement[]
  onBallActionDeselect: () => void
  onBallActionCancel: () => void
  onKickEndpointMove: (actionId: string, coordinate: PitchCoordinate) => void
  onPassEndpointDrop: (actionId: string, playerId: string | null) => void
  onBallActionPitchTarget: (coordinate: PitchCoordinate) => void
  onBallActionPlayerTarget: (playerId: string) => void
  onBallActionRemove: (actionId: string) => void
  onBallActionSelect: (actionId: string) => void
  onBallActionStart: (
    type: BallAction["type"],
    originPlayerId: string,
    actionId?: string,
  ) => void
  onBallDrop: (playerId: string | null, coordinate: PitchCoordinate) => void
  onBallMove: (coordinate: PitchCoordinate) => void
  onBallRelease: (playerId: string) => void
  onBallSelect: (selected: boolean) => void
  onMovementEndpointMove: (
    id: string,
    endpoint: "end" | "start",
    coordinate: PitchCoordinate,
  ) => void
  onMovementMove: (id: string, coordinate: PitchCoordinate) => void
  onMovementEditCancel: () => void
  onMovementEditFinish: () => void
  onMovementPlace: (coordinate: PitchCoordinate) => void
  onMovementSelect: (id: string | null) => void
  onPlayerMovementCancel: () => void
  onPlayerMovementControlMove: (
    playerId: string,
    controlPointIndex: number,
    coordinate: PitchCoordinate,
  ) => void
  onPlayerMovementDestinationMove: (
    playerId: string,
    coordinate: PitchCoordinate,
  ) => void
  onPlayerMovementDeselect: () => void
  onPlayerMovementFinish: () => void
  onPlayerMovementRemove: (playerId: string) => void
  onPlayerMovementSelect: (movementId: string) => void
  onPlayerMovementStart: (playerId: string) => void
  onPlayerMovementStraighten: (playerId: string) => void
  onPlayerMovementTarget: (
    playerId: string,
    coordinate: PitchCoordinate,
  ) => void
  onPlayerMove: (id: string, coordinate: PitchCoordinate) => void
  onPlayerSelect: (id: string | null) => void
  playerMovements: Record<string, PlayerMovement>
  players: PlayerPlacement[]
  selectedBallActionId: string | null
  selectedPlayerId: string | null
  selectedPlayerMovementId: string | null
  selectedMovementId: string | null
  targetingPlayerId: string | null
}

function RugbyPitch({
  activeMovementDirection,
  ball,
  ballActions,
  ballActionTargeting,
  ballPossessionPlayerId,
  isBallSelected,
  movements,
  onBallActionDeselect,
  onBallActionCancel,
  onKickEndpointMove,
  onPassEndpointDrop,
  onBallActionPitchTarget,
  onBallActionPlayerTarget,
  onBallActionRemove,
  onBallActionSelect,
  onBallActionStart,
  onBallDrop,
  onBallMove,
  onBallRelease,
  onBallSelect,
  onMovementEndpointMove,
  onMovementMove,
  onMovementEditCancel,
  onMovementEditFinish,
  onMovementPlace,
  onMovementSelect,
  onPlayerMovementCancel,
  onPlayerMovementControlMove,
  onPlayerMovementDestinationMove,
  onPlayerMovementDeselect,
  onPlayerMovementFinish,
  onPlayerMovementRemove,
  onPlayerMovementSelect,
  onPlayerMovementStart,
  onPlayerMovementStraighten,
  onPlayerMovementTarget,
  onPlayerMove,
  onPlayerSelect,
  playerMovements,
  players,
  selectedBallActionId,
  selectedPlayerId,
  selectedPlayerMovementId,
  selectedMovementId,
  targetingPlayerId,
}: RugbyPitchProps) {
  const pitchRef = useRef<SVGSVGElement>(null)
  const dragRef = useRef<{
    controlPointIndex: number | null
    hasMoved: boolean
    id: string
    kind: "ball" | "kick-endpoint" | "movement" | "movement-endpoint" | "pass-endpoint" | "player" | "player-movement-control" | "player-movement-destination"
    offsetX: number
    offsetY: number
    movementEndpoint: "end" | "start" | null
    pointerId: number
    startPointerX: number
    startPointerY: number
  } | null>(null)
  const ignorePitchClickRef = useRef(false)
  const [draggingObject, setDraggingObject] = useState<{
    id: string
    kind: "ball" | "kick-endpoint" | "movement" | "movement-endpoint" | "pass-endpoint" | "player" | "player-movement-control" | "player-movement-destination"
    movementEndpoint: "end" | "start" | null
  } | null>(null)
  const [passEndpointPreview, setPassEndpointPreview] = useState<{
    actionId: string
    coordinate: PitchCoordinate
  } | null>(null)

  const getPitchCoordinate = (clientX: number, clientY: number) => {
    const pitch = pitchRef.current
    const screenMatrix = pitch?.getScreenCTM()
    if (!pitch || !screenMatrix) {
      return null
    }

    const point = pitch.createSVGPoint()
    point.x = clientX
    point.y = clientY
    return point.matrixTransform(screenMatrix.inverse())
  }

  const handlePitchClick = (event: ReactMouseEvent<SVGSVGElement>) => {
    if (ignorePitchClickRef.current) {
      ignorePitchClickRef.current = false
      return
    }

    const pitchPoint = getPitchCoordinate(event.clientX, event.clientY)
    if (!pitchPoint) {
      return
    }

    if (targetingPlayerId) {
      onPlayerMovementTarget(
        targetingPlayerId,
        clampToPlayablePitch(pitchPoint),
      )
      return
    }

    if (ballActionTargeting) {
      if (ballActionTargeting.type === "kick") {
        onBallActionPitchTarget(clampToPlayablePitch(pitchPoint))
      }
      return
    }

    if (selectedPlayerMovementId) {
      onPlayerMovementDeselect()
      return
    }

    if (selectedBallActionId) {
      onBallActionDeselect()
      return
    }

    onBallSelect(false)
    onPlayerSelect(null)
    if (!activeMovementDirection) {
      onMovementSelect(null)
      return
    }

    onMovementPlace(clampToPlayablePitch(pitchPoint))
  }

  const handleObjectPointerDown = (
    event: ReactPointerEvent<SVGElement>,
    object: PitchCoordinate & {
      controlPointIndex?: number
      id: string
      kind: "ball" | "kick-endpoint" | "movement" | "movement-endpoint" | "pass-endpoint" | "player" | "player-movement-control" | "player-movement-destination"
      movementEndpoint?: "end" | "start"
    },
  ) => {
    if (
      !event.isPrimary ||
      (event.pointerType === "mouse" && event.button !== 0)
    ) {
      return
    }

    const pitchPoint = getPitchCoordinate(event.clientX, event.clientY)
    const pitch = pitchRef.current
    if (!pitchPoint || !pitch) {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    pitch.setPointerCapture(event.pointerId)
    dragRef.current = {
      controlPointIndex: object.controlPointIndex ?? null,
      hasMoved: false,
      id: object.id,
      kind: object.kind,
      offsetX: pitchPoint.x - object.x,
      offsetY: pitchPoint.y - object.y,
      movementEndpoint: object.movementEndpoint ?? null,
      pointerId: event.pointerId,
      startPointerX: pitchPoint.x,
      startPointerY: pitchPoint.y,
    }
    ignorePitchClickRef.current = true
    setDraggingObject({
      id: object.id,
      kind: object.kind,
      movementEndpoint: object.movementEndpoint ?? null,
    })

    if (object.kind === "movement") {
      onMovementSelect(object.id)
    }
  }

  const moveDraggedObject = (
    drag: NonNullable<typeof dragRef.current>,
    coordinate: PitchCoordinate,
  ) => {
    if (drag.kind === "ball") {
      onBallMove(coordinate)
    } else if (drag.kind === "movement") {
      onMovementMove(drag.id, coordinate)
    } else if (drag.kind === "movement-endpoint") {
      onMovementEndpointMove(
        drag.id,
        drag.movementEndpoint ?? "end",
        coordinate,
      )
    } else if (drag.kind === "kick-endpoint") {
      onKickEndpointMove(drag.id, coordinate)
    } else if (drag.kind === "pass-endpoint") {
      setPassEndpointPreview({ actionId: drag.id, coordinate })
    } else if (drag.kind === "player-movement-control") {
      onPlayerMovementControlMove(
        drag.id,
        drag.controlPointIndex ?? 0,
        coordinate,
      )
    } else if (drag.kind === "player-movement-destination") {
      onPlayerMovementDestinationMove(drag.id, coordinate)
    } else {
      onPlayerMove(drag.id, coordinate)
    }
  }

  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) {
      return
    }

    const pitchPoint = getPitchCoordinate(event.clientX, event.clientY)
    if (!pitchPoint) {
      return
    }

    if (
      !drag.hasMoved &&
      Math.hypot(
        pitchPoint.x - drag.startPointerX,
        pitchPoint.y - drag.startPointerY,
      ) < 4
    ) {
      return
    }

    drag.hasMoved = true
    event.preventDefault()
    moveDraggedObject(
      drag,
      clampToPlayablePitch({
        x: pitchPoint.x - drag.offsetX,
        y: pitchPoint.y - drag.offsetY,
      }),
    )
  }

  const endPlayerDrag = (event: ReactPointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) {
      return
    }

    const pitchPoint = getPitchCoordinate(event.clientX, event.clientY)
    if (pitchPoint && drag.hasMoved) {
      const finalCoordinate = clampToPlayablePitch({
        x: pitchPoint.x - drag.offsetX,
        y: pitchPoint.y - drag.offsetY,
      })
      moveDraggedObject(drag, finalCoordinate)
      if (drag.kind === "ball") {
        const dropPlayer = players.reduce<{
          distance: number
          player: PlayerPlacement
        } | null>((nearest, player) => {
          const distance = Math.hypot(
            player.x - pitchPoint.x,
            player.y - pitchPoint.y,
          )
          if (
            distance > playerBallDropRadius ||
            (nearest && nearest.distance <= distance)
          ) {
            return nearest
          }
          return { distance, player }
        }, null)
        onBallDrop(dropPlayer?.player.id ?? null, finalCoordinate)
      } else if (drag.kind === "pass-endpoint") {
        const dropPlayer = players.reduce<{
          distance: number
          player: PlayerPlacement
        } | null>((nearest, player) => {
          const distance = Math.hypot(
            player.x - pitchPoint.x,
            player.y - pitchPoint.y,
          )
          if (
            distance > playerBallDropRadius ||
            (nearest && nearest.distance <= distance)
          ) {
            return nearest
          }
          return { distance, player }
        }, null)
        onPassEndpointDrop(drag.id, dropPlayer?.player.id ?? null)
      }
    }

    if (drag.kind === "player") {
      if (!drag.hasMoved && ballActionTargeting?.type === "pass") {
        onBallActionPlayerTarget(drag.id)
      } else if (!drag.hasMoved && ballActionTargeting?.type === "kick") {
        // Kick destinations must be empty pitch locations.
      } else {
        onPlayerSelect(drag.id)
      }
    } else if (drag.kind === "ball") {
      onBallSelect(true)
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    dragRef.current = null
    setDraggingObject(null)
    setPassEndpointPreview(null)
    window.setTimeout(() => {
      ignorePitchClickRef.current = false
    }, 0)
  }

  const cancelPlayerDrag = (event: ReactPointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) {
      return
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    dragRef.current = null
    setDraggingObject(null)
    setPassEndpointPreview(null)
    ignorePitchClickRef.current = false
  }

  useEffect(() => {
    if (!draggingObject) {
      return
    }

    const cancelEndpointDrag = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !draggingObject.kind.includes("endpoint")) {
        return
      }

      const drag = dragRef.current
      const pitch = pitchRef.current
      if (drag && pitch?.hasPointerCapture(drag.pointerId)) {
        pitch.releasePointerCapture(drag.pointerId)
      }
      dragRef.current = null
      setDraggingObject(null)
      setPassEndpointPreview(null)
      ignorePitchClickRef.current = false
    }

    window.addEventListener("keydown", cancelEndpointDrag)
    return () => window.removeEventListener("keydown", cancelEndpointDrag)
  }, [draggingObject])

  const selectedPlayerMovement = selectedPlayerMovementId
    ? Object.values(playerMovements).find(
        (movement) => movement.id === selectedPlayerMovementId,
      )
    : undefined
  const selectedPlayerMovementPlayer = selectedPlayerMovement
    ? players.find((player) => player.id === selectedPlayerMovement.playerId)
    : undefined
  const possessingPlayer = ballPossessionPlayerId
    ? players.find((player) => player.id === ballPossessionPlayerId)
    : undefined
  const selectedBallAction = selectedBallActionId
    ? ballActions.find((action) => action.id === selectedBallActionId)
    : undefined
  const selectedIndependentMovement = selectedMovementId
    ? movements.find((movement) => movement.id === selectedMovementId)
    : undefined

  return (
    <svg
      aria-label="Rugby pitch"
      className={`pitch${
        activeMovementDirection ||
        targetingPlayerId ||
        ballActionTargeting?.type === "kick"
          ? " pitch-placement-mode"
          : ""
      }`}
      onClick={handlePitchClick}
      onPointerCancel={cancelPlayerDrag}
      onPointerMove={handlePointerMove}
      onPointerUp={endPlayerDrag}
      preserveAspectRatio="xMidYMid meet"
      ref={pitchRef}
      role="img"
      viewBox="0 0 1612.005 952"
    >
      <defs>
        {(["attack", "defense"] as FormationId[]).map((formation) => {
          const color = teamArrowStyles[formation].color
          return (
            <g key={`${formation}-arrowheads`}>
              <marker
                id={`${formation}-movement-arrowhead`}
                markerHeight="22"
                markerUnits="userSpaceOnUse"
                markerWidth="22"
                orient="auto"
                refX="22"
                refY="11"
                viewBox="0 0 22 22"
              >
                <path d="M 0 0 L 22 11 L 0 22 z" fill={color} />
              </marker>
              <marker
                id={`${formation}-pass-arrowhead`}
                markerHeight="14"
                markerUnits="userSpaceOnUse"
                markerWidth="14"
                orient="auto"
                refX="12"
                refY="7"
                viewBox="0 0 14 14"
              >
                <path
                  d="M 2 2 L 12 7 L 2 12"
                  fill="none"
                  stroke={color}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                />
              </marker>
              <marker
                id={`${formation}-kick-arrowhead`}
                markerHeight="30"
                markerUnits="userSpaceOnUse"
                markerWidth="30"
                orient="auto"
                refX="30"
                refY="15"
                viewBox="0 0 30 30"
              >
                <path d="M 0 15 L 15 1 L 30 15 L 15 29 z" fill={color} />
              </marker>
            </g>
          )
        })}
      </defs>
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

      <g aria-label="Planned player movements">
        {Object.values(playerMovements).map((movement) => {
          const movementPlayer = players.find(
            (player) => player.id === movement.playerId,
          )
          if (!movementPlayer) {
            return null
          }

          return (
            <PlayerMovementArrow
              formation={movementPlayer.formation}
              isSelected={movement.id === selectedPlayerMovementId}
              key={movement.id}
              movement={movement}
              onControlDragStart={(
                event,
                selectedMovement,
                controlPointIndex,
                coordinate,
              ) =>
                handleObjectPointerDown(event, {
                  ...coordinate,
                  controlPointIndex,
                  id: selectedMovement.playerId,
                  kind: "player-movement-control",
                })
              }
              onDestinationDragStart={(event, selectedMovement) =>
                handleObjectPointerDown(event, {
                  ...selectedMovement.destination,
                  id: selectedMovement.playerId,
                  kind: "player-movement-destination",
                })
              }
              onSelect={onPlayerMovementSelect}
            />
          )
        })}
      </g>

      <g aria-label="Ball action routes">
        {ballActions.map((action) => {
          const origin = players.find(
            (player) => player.id === action.originPlayerId,
          )
          const endpoint =
            action.type === "pass"
              ? players.find((player) => player.id === action.receiverPlayerId)
              : action.destination
          if (!origin || !endpoint) {
            return null
          }
          const displayedEndpoint =
            passEndpointPreview?.actionId === action.id
              ? passEndpointPreview.coordinate
              : endpoint

          return (
            <BallActionArrow
              action={action}
              endpoint={displayedEndpoint}
              formation={origin.formation}
              isSelected={action.id === selectedBallActionId}
              key={action.id}
              onEndpointDragStart={(event, selectedAction, coordinate) =>
                handleObjectPointerDown(event, {
                  ...coordinate,
                  id: selectedAction.id,
                  kind:
                    selectedAction.type === "pass"
                      ? "pass-endpoint"
                      : "kick-endpoint",
                })
              }
              onSelect={onBallActionSelect}
              origin={origin}
            />
          )
        })}
      </g>

      <g aria-label="Placed players">
        {players.map((player) => {
          const markerStyle = playerMarkerStyles[player.formation]

          return (
            <g
              key={player.id}
              aria-label={`${player.formation} ${player.position}`}
              data-dragging={
                draggingObject?.kind === "player" &&
                draggingObject.id === player.id
              }
              data-player-id={player.id}
              onPointerDown={(event) =>
                handleObjectPointerDown(event, {
                  ...player,
                  kind: "player",
                })
              }
            >
              {selectedPlayerId === player.id && (
                <circle
                  cx={player.x}
                  cy={player.y}
                  fill="none"
                  r="41"
                  stroke={teamArrowStyles[player.formation].color}
                  strokeDasharray="8 6"
                  strokeWidth="5"
                />
              )}
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

      {selectedPlayerMovement && selectedPlayerMovementPlayer && (
        <g aria-label="Selected player movement endpoints">
          <circle
            cx={selectedPlayerMovement.start.x}
            cy={selectedPlayerMovement.start.y}
            fill={teamArrowStyles[selectedPlayerMovementPlayer.formation].color}
            pointerEvents="none"
            r="10"
            stroke="#f9fafb"
            strokeWidth="3"
          />
          <circle
            className="arrow-endpoint-control"
            cx={selectedPlayerMovement.destination.x}
            cy={selectedPlayerMovement.destination.y}
            data-endpoint="destination"
            fill={teamArrowStyles[selectedPlayerMovementPlayer.formation].color}
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) =>
              handleObjectPointerDown(event, {
                ...selectedPlayerMovement.destination,
                id: selectedPlayerMovement.playerId,
                kind: "player-movement-destination",
              })
            }
            r="12"
            stroke="#f9fafb"
            strokeWidth="4"
          />
        </g>
      )}

      {selectedBallAction &&
        (() => {
          const origin = players.find(
            (player) => player.id === selectedBallAction.originPlayerId,
          )
          const savedEndpoint =
            selectedBallAction.type === "pass"
              ? players.find(
                  (player) => player.id === selectedBallAction.receiverPlayerId,
                )
              : selectedBallAction.destination
          if (!origin || !savedEndpoint) {
            return null
          }
          const endpoint =
            passEndpointPreview?.actionId === selectedBallAction.id
              ? passEndpointPreview.coordinate
              : savedEndpoint

          return (
            <g aria-label="Selected ball action endpoints">
              <circle
                cx={origin.x}
                cy={origin.y}
                fill={teamArrowStyles[origin.formation].color}
                pointerEvents="none"
                r="10"
                stroke="#f9fafb"
                strokeWidth="3"
              />
              <circle
                className="arrow-endpoint-control"
                cx={endpoint.x}
                cy={endpoint.y}
                data-endpoint="destination"
                fill={teamArrowStyles[origin.formation].color}
                onClick={(event) => event.stopPropagation()}
                onPointerDown={(event) =>
                  handleObjectPointerDown(event, {
                    ...endpoint,
                    id: selectedBallAction.id,
                    kind:
                      selectedBallAction.type === "pass"
                        ? "pass-endpoint"
                        : "kick-endpoint",
                  })
                }
                r="12"
                stroke="#f9fafb"
                strokeWidth="4"
              />
            </g>
          )
        })()}

      {ball && !possessingPlayer && (
        <g aria-label="Loose rugby ball">
          {isBallSelected && (
            <rect
              fill="none"
              height="87.5691"
              rx="18"
              stroke="#10b981"
              strokeDasharray="8 6"
              strokeWidth="5"
              width="126.18"
              x={ball.x - 63.09}
              y={ball.y - 43.78455}
            />
          )}
          <image
            aria-label="Rugby ball"
            data-ball-id={ball.id}
            data-dragging={
              draggingObject?.kind === "ball" && draggingObject.id === ball.id
            }
            href={`${assetPath}/e4ca3.svg`}
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) =>
              handleObjectPointerDown(event, { ...ball, kind: "ball" })
            }
            width="106.18"
            height="67.5691"
            x={ball.x - 53.09}
            y={ball.y - 33.78455}
          />
        </g>
      )}
      {ball && possessingPlayer && (
        <g aria-label="Possessed rugby ball">
          {isBallSelected && (
            <rect
              fill="none"
              height="45.82"
              rx="12"
              stroke="#10b981"
              strokeDasharray="7 5"
              strokeWidth="4"
              width="64"
              x={possessingPlayer.x + 11}
              y={possessingPlayer.y - 47}
            />
          )}
          <image
            aria-label={`Rugby ball possessed by player ${possessingPlayer.jerseyNumber}`}
            className="player-ball-indicator"
            height="31.82"
            href={`${assetPath}/e4ca3.svg`}
            onClick={(event) => {
              event.stopPropagation()
              onBallSelect(true)
            }}
            onPointerDown={(event) => event.stopPropagation()}
            width="50"
            x={possessingPlayer.x + 18}
            y={possessingPlayer.y - 40}
          />
        </g>
      )}

      <g aria-label="Movement arrows">
        {movements.map((movement) => (
          <MovementArrow
            draggingEndpoint={
              draggingObject?.kind === "movement-endpoint" &&
              draggingObject.id === movement.id
                ? draggingObject.movementEndpoint
                : null
            }
            isDragging={
              (draggingObject?.kind === "movement" ||
                draggingObject?.kind === "movement-endpoint") &&
              draggingObject.id === movement.id
            }
            isSelected={selectedMovementId === movement.id}
            key={movement.id}
            movement={movement}
            onDragStart={(event, draggedMovement) =>
              handleObjectPointerDown(event, {
                ...draggedMovement,
                kind: "movement",
              })
            }
            onEndpointDragStart={(event, selectedArrow, endpoint) => {
              const endpointCoordinate =
                getDirectionalArrowEndpoints(selectedArrow)[endpoint]
              handleObjectPointerDown(event, {
                ...endpointCoordinate,
                id: selectedArrow.id,
                kind: "movement-endpoint",
                movementEndpoint: endpoint,
              })
            }}
            onSelect={(id) => onMovementSelect(id)}
          />
        ))}
      </g>

      {selectedPlayerId &&
        (() => {
          const selectedPlayer = players.find(
            (player) => player.id === selectedPlayerId,
          )
          if (!selectedPlayer) {
            return null
          }

          return (
            <PlayerContextMenu
              hasMovement={Boolean(playerMovements[selectedPlayer.id])}
              hasPossession={ballPossessionPlayerId === selectedPlayer.id}
              onCancel={() => onPlayerSelect(null)}
              onKick={() => onBallActionStart("kick", selectedPlayer.id)}
              onMove={() => onPlayerMovementStart(selectedPlayer.id)}
              onPass={() => onBallActionStart("pass", selectedPlayer.id)}
              onReleaseBall={() => onBallRelease(selectedPlayer.id)}
              onRemoveMovement={() => onPlayerMovementRemove(selectedPlayer.id)}
              player={selectedPlayer}
              targetingMode={
                targetingPlayerId === selectedPlayer.id
                  ? "move"
                  : ballActionTargeting?.originPlayerId === selectedPlayer.id
                    ? ballActionTargeting.type
                    : null
              }
            />
          )
        })()}
      {selectedPlayerMovement &&
        (() => {
          const movementPlayer = players.find(
            (player) => player.id === selectedPlayerMovement.playerId,
          )
          if (!movementPlayer) {
            return null
          }

          return (
            <PlayerMovementEditor
              movement={selectedPlayerMovement}
              onCancel={onPlayerMovementCancel}
              onFinish={onPlayerMovementFinish}
              onStraighten={() =>
                onPlayerMovementStraighten(selectedPlayerMovement.playerId)
              }
              playerNumber={movementPlayer.jerseyNumber}
            />
          )
        })()}
      {selectedBallAction &&
        (() => {
          const origin = players.find(
            (player) => player.id === selectedBallAction.originPlayerId,
          )
          const endpoint =
            selectedBallAction.type === "pass"
              ? players.find(
                  (player) => player.id === selectedBallAction.receiverPlayerId,
                )
              : selectedBallAction.destination
          if (!origin || !endpoint) {
            return null
          }

          return (
            <BallActionEditor
              action={selectedBallAction}
              endpoint={endpoint}
              onCancel={onBallActionCancel}
              onEdit={() =>
                onBallActionStart(
                  selectedBallAction.type,
                  selectedBallAction.originPlayerId,
                  selectedBallAction.id,
                )
              }
              onRemove={() => onBallActionRemove(selectedBallAction.id)}
              origin={origin}
            />
          )
        })()}
      {selectedIndependentMovement && (
        <IndependentMovementEditor
          movement={selectedIndependentMovement}
          onCancel={onMovementEditCancel}
          onFinish={onMovementEditFinish}
        />
      )}
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

type HelpPanelProps = {
  onClose: () => void
}

function HelpPanel({ onClose }: HelpPanelProps) {
  return (
    <aside className="help-panel" aria-label="Help panel">
      <div className="tool-panel-header">
        <div className="tool-panel-title">
          <span className="help-panel-icon" aria-hidden="true">
            ?
          </span>
          <h2>Help</h2>
        </div>
        <button
          aria-label="Close Help"
          className="help-close"
          onClick={onClose}
          type="button"
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
      <div className="help-content">
        <section className="help-section">
          <h3>Getting Started</h3>
          <p>
            Rugby Play Designer helps you create rugby plays by organizing
            players, the ball, movement arrows, and phases on the pitch.
          </p>
        </section>
        <section className="help-section">
          <h3>Players</h3>
          <p>
            Open Players from the left toolbar, then choose a player from the
            Attack or Defense list to add them to the pitch. Select the same
            highlighted player again to remove them. Each phase keeps its own
            player placements.
          </p>
        </section>
        <section className="help-section">
          <h3>Movement</h3>
          <p>
            Open Movement, select a directional arrow, then click the pitch to
            place it. Select a placed arrow to remove it with the panel action
            or the Delete or Backspace key.
          </p>
        </section>
        <section className="help-section">
          <h3>Ball</h3>
          <p>
            Open Ball and select Rugby ball to place it on the pitch. Select it
            again to remove it from the current phase.
          </p>
        </section>
        <section className="help-section">
          <h3>Phases</h3>
          <p>
            Open Phases to edit phase names, add new phases, or remove phases
            you no longer need. Use the controls at the bottom to move between
            phases. Player placements are maintained separately for each phase.
          </p>
        </section>
        <section className="help-section">
          <h3>Drawing</h3>
          <p>
            The Drawing button currently toggles its visual state. Drawing
            functionality has not yet been implemented.
          </p>
        </section>
        <section className="help-section">
          <h3>Playback Controls</h3>
          <p>
            Use the previous and next buttons to navigate between phases. The
            center play button currently toggles its play state; playback
            animation is not yet implemented. The phase indicator shows your
            current phase and the total number of phases.
          </p>
        </section>
      </div>
    </aside>
  )
}

export default function App() {
  const [activePanel, setActivePanel] = useState<ActivePanel>(null)
  const [isDrawingActive, setIsDrawingActive] = useState(false)
  const [isBallSelected, setIsBallSelected] = useState(false)
  const [isHelpOpen, setIsHelpOpen] = useState(false)
  const [activeMovementDirection, setActiveMovementDirection] =
    useState<MovementDirection | null>(null)
  const [ballActionTargeting, setBallActionTargeting] =
    useState<BallActionTargeting | null>(null)
  const [selectedBallActionId, setSelectedBallActionId] =
    useState<string | null>(null)
  const [selectedMovementId, setSelectedMovementId] = useState<string | null>(
    null,
  )
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [selectedPlayerMovementId, setSelectedPlayerMovementId] =
    useState<string | null>(null)
  const [targetingPlayerId, setTargetingPlayerId] = useState<string | null>(
    null,
  )
  const [phases, setPhases] = useState<Phase[]>(() => [
    createPhase("phase-1", "Phase 1 name"),
    createPhase("phase-2", "Phase 2 name"),
    createPhase("phase-3", "Phase 3 name"),
  ])
  const [currentPhaseId, setCurrentPhaseId] = useState("phase-1")
  const nextBallActionId = useRef(1)
  const nextMovementId = useRef(1)
  const nextPhaseId = useRef(4)
  const nextPlayerMovementId = useRef(1)
  const ballActionEditSnapshotRef = useRef<{
    action: BallAction
    phaseId: string
  } | null>(null)
  const independentMovementSnapshotRef = useRef<{
    movement: MovementPlacement
    phaseId: string
  } | null>(null)
  const playerMovementEditSnapshotRef = useRef<{
    movement: PlayerMovement
    phaseId: string
  } | null>(null)

  const togglePanel = (panel: Exclude<ActivePanel, null>) => {
    const nextPanel = activePanel === panel ? null : panel
    setActivePanel(nextPanel)
    if (nextPanel !== "movement") {
      setActiveMovementDirection(null)
    }
  }

  useEffect(() => {
    if (!activePanel) {
      return
    }

    const closePanelOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target
      if (
        target instanceof Element &&
        target.closest(".tool-panel, .tool-button")
      ) {
        return
      }
      setActivePanel(null)
    }

    document.addEventListener("pointerdown", closePanelOnOutsidePointer, true)
    return () =>
      document.removeEventListener(
        "pointerdown",
        closePanelOnOutsidePointer,
        true,
      )
  }, [activePanel])

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
      setIsBallSelected(false)
      setBallActionTargeting(null)
      setSelectedBallActionId(null)
      setSelectedMovementId(null)
      setSelectedPlayerId(null)
      setSelectedPlayerMovementId(null)
      setTargetingPlayerId(null)
      ballActionEditSnapshotRef.current = null
      independentMovementSnapshotRef.current = null
      playerMovementEditSnapshotRef.current = null
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

    if (selectedPlayerId === playerId) {
      setSelectedPlayerId(null)
      setTargetingPlayerId(null)
    }
    if (
      phases.find((phase) => phase.id === currentPhaseId)?.playData
        .playerMovements[playerId]?.id === selectedPlayerMovementId
    ) {
      setSelectedPlayerMovementId(null)
      playerMovementEditSnapshotRef.current = null
    }
    const selectedBallAction = phases
      .find((phase) => phase.id === currentPhaseId)
      ?.playData.ballActions.find(
        (action) => action.id === selectedBallActionId,
      )
    if (
      selectedBallAction?.originPlayerId === playerId ||
      (selectedBallAction?.type === "pass" &&
        selectedBallAction.receiverPlayerId === playerId)
    ) {
      setSelectedBallActionId(null)
      setBallActionTargeting(null)
      ballActionEditSnapshotRef.current = null
    }

    setPhases((current) =>
      current.map((phase) => {
        if (phase.id !== currentPhaseId) {
          return phase
        }

        const existingPlacement = phase.playData.playerPositions[playerId]
        if (existingPlacement) {
          const { [playerId]: removedPlayer, ...remainingPlayers } =
            phase.playData.playerPositions
          const { [playerId]: removedMovement, ...remainingPlayerMovements } =
            phase.playData.playerMovements
          void removedPlayer
          void removedMovement
          const hadPossession =
            phase.playData.ballPossessionPlayerId === playerId

          return {
            ...phase,
            playData: {
              ...phase.playData,
              ball: hadPossession
                ? {
                    id: "rugby-ball",
                    x: existingPlacement.x,
                    y: existingPlacement.y,
                  }
                : phase.playData.ball,
              ballPossessionPlayerId: hadPossession
                ? null
                : phase.playData.ballPossessionPlayerId,
              ballActions: phase.playData.ballActions.filter(
                (action) =>
                  action.originPlayerId !== playerId &&
                  (action.type !== "pass" ||
                    action.receiverPlayerId !== playerId),
              ),
              playerMovements: remainingPlayerMovements,
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

  const removePlayerFromCurrentPhase = (playerId: string) => {
    setPhases((current) =>
      current.map((phase) => {
        if (phase.id !== currentPhaseId) {
          return phase
        }

        const player = phase.playData.playerPositions[playerId]
        if (!player) {
          return phase
        }

        const { [playerId]: removedPlayer, ...remainingPlayers } =
          phase.playData.playerPositions
        const { [playerId]: removedMovement, ...remainingPlayerMovements } =
          phase.playData.playerMovements
        void removedPlayer
        void removedMovement
        const hadPossession = phase.playData.ballPossessionPlayerId === playerId

        return {
          ...phase,
          playData: {
            ...phase.playData,
            ball: hadPossession
              ? { id: "rugby-ball", x: player.x, y: player.y }
              : phase.playData.ball,
            ballActions: phase.playData.ballActions.filter(
              (action) =>
                action.originPlayerId !== playerId &&
                (action.type !== "pass" ||
                  action.receiverPlayerId !== playerId),
            ),
            ballPossessionPlayerId: hadPossession
              ? null
              : phase.playData.ballPossessionPlayerId,
            playerMovements: remainingPlayerMovements,
            playerPositions: remainingPlayers,
          },
        }
      }),
    )
    setBallActionTargeting(null)
    setSelectedBallActionId(null)
    ballActionEditSnapshotRef.current = null
    setSelectedPlayerId(null)
    setSelectedPlayerMovementId(null)
    playerMovementEditSnapshotRef.current = null
    setTargetingPlayerId(null)
  }

  const toggleBall = () => {
    setIsBallSelected(false)
    setPhases((current) =>
      current.map((phase) =>
        phase.id === currentPhaseId
          ? {
              ...phase,
              playData: {
                ...phase.playData,
                ballPossessionPlayerId: null,
                ball: phase.playData.ball ? null : { ...defaultBallPosition },
              },
            }
          : phase,
      ),
    )
  }

  const movePlayer = (id: string, coordinate: PitchCoordinate) => {
    setPhases((current) =>
      current.map((phase) => {
        if (phase.id !== currentPhaseId) {
          return phase
        }

        const player = phase.playData.playerPositions[id]
        if (!player) {
          return phase
        }

        const playerMovement = phase.playData.playerMovements[id]
        return {
          ...phase,
          playData: {
            ...phase.playData,
            ball:
              phase.playData.ballPossessionPlayerId === id &&
              phase.playData.ball
                ? { ...phase.playData.ball, ...coordinate }
                : phase.playData.ball,
            playerMovements: playerMovement
              ? {
                  ...phase.playData.playerMovements,
                  [id]: {
                    ...playerMovement,
                    start: { ...coordinate },
                  },
                }
              : phase.playData.playerMovements,
            playerPositions: {
              ...phase.playData.playerPositions,
              [id]: { ...player, ...coordinate },
            },
          },
        }
      }),
    )
  }

  const moveBall = (coordinate: PitchCoordinate) => {
    setPhases((current) =>
      current.map((phase) =>
        phase.id === currentPhaseId && phase.playData.ball
          ? {
              ...phase,
              playData: {
                ...phase.playData,
                ball: { ...phase.playData.ball, ...coordinate },
              },
            }
          : phase,
      ),
    )
  }

  const setBallPossession = (
    playerId: string | null,
    coordinate: PitchCoordinate,
  ) => {
    setPhases((current) =>
      current.map((phase) => {
        if (phase.id !== currentPhaseId || !phase.playData.ball) {
          return phase
        }

        const validPlayerId =
          playerId && phase.playData.playerPositions[playerId] ? playerId : null
        return {
          ...phase,
          playData: {
            ...phase.playData,
            ball: { ...phase.playData.ball, ...coordinate },
            ballPossessionPlayerId: validPlayerId,
          },
        }
      }),
    )
  }

  const releaseBall = (playerId: string) => {
    setPhases((current) =>
      current.map((phase) => {
        if (
          phase.id !== currentPhaseId ||
          phase.playData.ballPossessionPlayerId !== playerId
        ) {
          return phase
        }

        const player = phase.playData.playerPositions[playerId]
        if (!player) {
          return phase
        }

        return {
          ...phase,
          playData: {
            ...phase.playData,
            ball: {
              id: "rugby-ball",
              x: player.x,
              y: player.y,
            },
            ballPossessionPlayerId: null,
          },
        }
      }),
    )
  }

  const selectBall = (selected: boolean) => {
    setIsBallSelected(selected)
    if (!selected) {
      return
    }

    setBallActionTargeting(null)
    setSelectedBallActionId(null)
    ballActionEditSnapshotRef.current = null
    setSelectedMovementId(null)
    independentMovementSnapshotRef.current = null
    setSelectedPlayerId(null)
    setSelectedPlayerMovementId(null)
    playerMovementEditSnapshotRef.current = null
    setTargetingPlayerId(null)
    setActiveMovementDirection(null)
  }

  const startBallActionTargeting = (
    type: BallAction["type"],
    originPlayerId: string,
    actionId?: string,
  ) => {
    setIsBallSelected(false)
    const activePhase = phases.find((phase) => phase.id === currentPhaseId)
    const origin = activePhase?.playData.playerPositions[originPlayerId]
    const existingAction = actionId
      ? activePhase?.playData.ballActions.find(
          (action) => action.id === actionId,
        )
      : null
    if (
      !activePhase ||
      !origin ||
      (actionId && (!existingAction || existingAction.type !== type)) ||
      (!existingAction &&
        activePhase.playData.ballPossessionPlayerId !== originPlayerId)
    ) {
      return
    }

    if (existingAction) {
      if (
        ballActionEditSnapshotRef.current?.action.id !== existingAction.id ||
        ballActionEditSnapshotRef.current.phaseId !== currentPhaseId
      ) {
        ballActionEditSnapshotRef.current = {
          action: cloneBallAction(existingAction),
          phaseId: currentPhaseId,
        }
      }
    } else {
      ballActionEditSnapshotRef.current = null
    }
    setBallActionTargeting({
      actionId: actionId ?? null,
      originPlayerId,
      type,
    })
    setSelectedBallActionId(null)
    setSelectedPlayerId(originPlayerId)
    setTargetingPlayerId(null)
    setSelectedPlayerMovementId(null)
    playerMovementEditSnapshotRef.current = null
    setSelectedMovementId(null)
    setActiveMovementDirection(null)
  }

  const targetPassRecipient = (receiverPlayerId: string) => {
    const targeting = ballActionTargeting
    if (!targeting || targeting.type !== "pass") {
      return
    }

    const activePhase = phases.find((phase) => phase.id === currentPhaseId)
    const origin =
      activePhase?.playData.playerPositions[targeting.originPlayerId]
    const receiver = activePhase?.playData.playerPositions[receiverPlayerId]
    if (
      !activePhase ||
      !origin ||
      !receiver ||
      origin.id === receiver.id ||
      origin.formation !== receiver.formation
    ) {
      return
    }

    const actionId =
      targeting.actionId ?? `ball-action-${nextBallActionId.current}`
    if (!targeting.actionId) {
      nextBallActionId.current += 1
    }
    const nextAction: PassAction = {
      id: actionId,
      originPlayerId: targeting.originPlayerId,
      receiverPlayerId,
      type: "pass",
    }
    if (!targeting.actionId) {
      ballActionEditSnapshotRef.current = {
        action: cloneBallAction(nextAction),
        phaseId: currentPhaseId,
      }
    }

    setPhases((current) =>
      current.map((phase) => {
        if (phase.id !== currentPhaseId) {
          return phase
        }

        return {
          ...phase,
          playData: {
            ...phase.playData,
            ballActions: targeting.actionId
              ? phase.playData.ballActions.map((action) =>
                  action.id === targeting.actionId ? nextAction : action,
                )
              : [...phase.playData.ballActions, nextAction],
          },
        }
      }),
    )
    setBallActionTargeting(null)
    setSelectedBallActionId(actionId)
    setSelectedPlayerId(null)
  }

  const targetKickDestination = (destination: PitchCoordinate) => {
    const targeting = ballActionTargeting
    if (!targeting || targeting.type !== "kick") {
      return
    }

    const actionId =
      targeting.actionId ?? `ball-action-${nextBallActionId.current}`
    if (!targeting.actionId) {
      nextBallActionId.current += 1
    }
    const nextAction: KickAction = {
      destination,
      id: actionId,
      originPlayerId: targeting.originPlayerId,
      type: "kick",
    }
    if (!targeting.actionId) {
      ballActionEditSnapshotRef.current = {
        action: cloneBallAction(nextAction),
        phaseId: currentPhaseId,
      }
    }

    setPhases((current) =>
      current.map((phase) => {
        if (phase.id !== currentPhaseId) {
          return phase
        }

        return {
          ...phase,
          playData: {
            ...phase.playData,
            ballActions: targeting.actionId
              ? phase.playData.ballActions.map((action) =>
                  action.id === targeting.actionId ? nextAction : action,
                )
              : [...phase.playData.ballActions, nextAction],
          },
        }
      }),
    )
    setBallActionTargeting(null)
    setSelectedBallActionId(actionId)
    setSelectedPlayerId(null)
  }

  const selectBallAction = (actionId: string) => {
    const action = phases
      .find((phase) => phase.id === currentPhaseId)
      ?.playData.ballActions.find((candidate) => candidate.id === actionId)
    if (!action) {
      return
    }

    setIsBallSelected(false)
    if (
      ballActionEditSnapshotRef.current?.action.id !== action.id ||
      ballActionEditSnapshotRef.current.phaseId !== currentPhaseId
    ) {
      ballActionEditSnapshotRef.current = {
        action: cloneBallAction(action),
        phaseId: currentPhaseId,
      }
    }
    setSelectedBallActionId(actionId)
    setBallActionTargeting(null)
    setSelectedPlayerId(null)
    setTargetingPlayerId(null)
    setSelectedPlayerMovementId(null)
    playerMovementEditSnapshotRef.current = null
    setSelectedMovementId(null)
    setActiveMovementDirection(null)
  }

  const deselectBallAction = () => {
    setSelectedBallActionId(null)
    ballActionEditSnapshotRef.current = null
  }

  const cancelBallActionEditing = () => {
    const snapshot = ballActionEditSnapshotRef.current
    if (snapshot && snapshot.phaseId === currentPhaseId) {
      setPhases((current) =>
        current.map((phase) =>
          phase.id === currentPhaseId
            ? {
                ...phase,
                playData: {
                  ...phase.playData,
                  ballActions: phase.playData.ballActions.map((action) =>
                    action.id === snapshot.action.id
                      ? cloneBallAction(snapshot.action)
                      : action,
                  ),
                },
              }
            : phase,
        ),
      )
    }
    setBallActionTargeting(null)
    setSelectedBallActionId(null)
    setSelectedPlayerId(null)
    ballActionEditSnapshotRef.current = null
  }

  const removeBallAction = (actionId: string) => {
    setPhases((current) =>
      current.map((phase) =>
        phase.id === currentPhaseId
          ? {
              ...phase,
              playData: {
                ...phase.playData,
                ballActions: phase.playData.ballActions.filter(
                  (action) => action.id !== actionId,
                ),
              },
            }
          : phase,
      ),
    )
    setSelectedBallActionId(null)
    setBallActionTargeting(null)
    ballActionEditSnapshotRef.current = null
  }

  const moveKickEndpoint = (actionId: string, destination: PitchCoordinate) => {
    setPhases((current) =>
      current.map((phase) =>
        phase.id === currentPhaseId
          ? {
              ...phase,
              playData: {
                ...phase.playData,
                ballActions: phase.playData.ballActions.map((action) =>
                  action.id === actionId && action.type === "kick"
                    ? { ...action, destination }
                    : action,
                ),
              },
            }
          : phase,
      ),
    )
  }

  const dropPassEndpoint = (
    actionId: string,
    receiverPlayerId: string | null,
  ) => {
    if (!receiverPlayerId) {
      return
    }

    setPhases((current) =>
      current.map((phase) => {
        if (phase.id !== currentPhaseId) {
          return phase
        }

        const action = phase.playData.ballActions.find(
          (candidate) => candidate.id === actionId,
        )
        const origin = action
          ? phase.playData.playerPositions[action.originPlayerId]
          : null
        const receiver = phase.playData.playerPositions[receiverPlayerId]
        if (
          !action ||
          action.type !== "pass" ||
          !origin ||
          !receiver ||
          origin.id === receiver.id ||
          origin.formation !== receiver.formation
        ) {
          return phase
        }

        return {
          ...phase,
          playData: {
            ...phase.playData,
            ballActions: phase.playData.ballActions.map((candidate) =>
              candidate.id === actionId
                ? { ...action, receiverPlayerId }
                : candidate,
            ),
          },
        }
      }),
    )
  }

  const moveMovement = (id: string, coordinate: PitchCoordinate) => {
    setPhases((current) =>
      current.map((phase) => {
        if (phase.id !== currentPhaseId) {
          return phase
        }

        return {
          ...phase,
          playData: {
            ...phase.playData,
            movementRoutes: phase.playData.movementRoutes.map((movement) => {
              if (movement.id !== id) {
                return movement
              }

              const endpoints = getDirectionalArrowEndpoints(movement)
              const desiredX = coordinate.x - movement.x
              const desiredY = coordinate.y - movement.y
              const deltaX = Math.min(
                playablePitchBounds.maxX -
                  Math.max(endpoints.start.x, endpoints.end.x),
                Math.max(
                  playablePitchBounds.minX -
                    Math.min(endpoints.start.x, endpoints.end.x),
                  desiredX,
                ),
              )
              const deltaY = Math.min(
                playablePitchBounds.maxY -
                  Math.max(endpoints.start.y, endpoints.end.y),
                Math.max(
                  playablePitchBounds.minY -
                    Math.min(endpoints.start.y, endpoints.end.y),
                  desiredY,
                ),
              )
              return {
                ...movement,
                end: {
                  x: endpoints.end.x + deltaX,
                  y: endpoints.end.y + deltaY,
                },
                start: {
                  x: endpoints.start.x + deltaX,
                  y: endpoints.start.y + deltaY,
                },
                x: movement.x + deltaX,
                y: movement.y + deltaY,
              }
            }),
          },
        }
      }),
    )
  }

  const moveMovementEndpoint = (
    id: string,
    endpoint: "end" | "start",
    coordinate: PitchCoordinate,
  ) => {
    setPhases((current) =>
      current.map((phase) => {
        if (phase.id !== currentPhaseId) {
          return phase
        }

        return {
          ...phase,
          playData: {
            ...phase.playData,
            movementRoutes: phase.playData.movementRoutes.map((movement) => {
              if (movement.id !== id) {
                return movement
              }

              const endpoints = getDirectionalArrowEndpoints(movement)
              const nextStart =
                endpoint === "start" ? coordinate : endpoints.start
              const nextEnd = endpoint === "end" ? coordinate : endpoints.end
              return {
                ...movement,
                end: nextEnd,
                start: nextStart,
                x: (nextStart.x + nextEnd.x) / 2,
                y: (nextStart.y + nextEnd.y) / 2,
              }
            }),
          },
        }
      }),
    )
  }

  const selectIndependentMovement = (id: string | null) => {
    if (!id) {
      setSelectedMovementId(null)
      independentMovementSnapshotRef.current = null
      return
    }

    setIsBallSelected(false)
    const movement = phases
      .find((phase) => phase.id === currentPhaseId)
      ?.playData.movementRoutes.find((candidate) => candidate.id === id)
    if (!movement) {
      return
    }

    independentMovementSnapshotRef.current = {
      movement: { ...movement },
      phaseId: currentPhaseId,
    }
    setSelectedMovementId(id)
  }

  const finishIndependentMovementEditing = () => {
    selectIndependentMovement(null)
  }

  const cancelIndependentMovementEditing = () => {
    const snapshot = independentMovementSnapshotRef.current
    if (snapshot && snapshot.phaseId === currentPhaseId) {
      setPhases((current) =>
        current.map((phase) =>
          phase.id === currentPhaseId
            ? {
                ...phase,
                playData: {
                  ...phase.playData,
                  movementRoutes: phase.playData.movementRoutes.map(
                    (movement) =>
                      movement.id === snapshot.movement.id
                        ? { ...snapshot.movement }
                        : movement,
                  ),
                },
              }
            : phase,
        ),
      )
    }
    setSelectedMovementId(null)
    independentMovementSnapshotRef.current = null
  }

  const selectPlayer = (id: string | null) => {
    setIsBallSelected(false)
    setBallActionTargeting(null)
    setSelectedBallActionId(null)
    ballActionEditSnapshotRef.current = null
    setSelectedPlayerId(id)
    setSelectedPlayerMovementId(null)
    setTargetingPlayerId(null)
    playerMovementEditSnapshotRef.current = null
    if (id) {
      setActiveMovementDirection(null)
    }
  }

  const startPlayerMovement = (playerId: string) => {
    setIsBallSelected(false)
    const existingMovement = phases.find((phase) => phase.id === currentPhaseId)
      ?.playData.playerMovements[playerId]
    playerMovementEditSnapshotRef.current = existingMovement
      ? {
          movement: clonePlayerMovement(existingMovement),
          phaseId: currentPhaseId,
        }
      : null
    setSelectedPlayerId(playerId)
    setBallActionTargeting(null)
    setSelectedBallActionId(null)
    ballActionEditSnapshotRef.current = null
    setSelectedPlayerMovementId(null)
    setTargetingPlayerId(playerId)
    setActiveMovementDirection(null)
    setSelectedMovementId(null)
  }

  const setPlayerMovementTarget = (
    playerId: string,
    destination: PitchCoordinate,
  ) => {
    const activePhase = phases.find((phase) => phase.id === currentPhaseId)
    const player = activePhase?.playData.playerPositions[playerId]
    if (!activePhase || !player) {
      return
    }

    const existingMovement = activePhase.playData.playerMovements[playerId]
    const nextMovement: PlayerMovement = existingMovement
      ? { ...existingMovement, destination }
      : {
          controlPoints: [],
          destination,
          id: `player-movement-${nextPlayerMovementId.current}`,
          playerId,
          start: { x: player.x, y: player.y },
        }
    if (!existingMovement) {
      nextPlayerMovementId.current += 1
      playerMovementEditSnapshotRef.current = {
        movement: clonePlayerMovement(nextMovement),
        phaseId: currentPhaseId,
      }
    }

    setPhases((current) =>
      current.map((phase) =>
        phase.id === currentPhaseId
          ? {
              ...phase,
              playData: {
                ...phase.playData,
                playerMovements: {
                  ...phase.playData.playerMovements,
                  [playerId]: nextMovement,
                },
              },
            }
          : phase,
      ),
    )
    setSelectedPlayerId(null)
    setSelectedPlayerMovementId(nextMovement.id)
    setTargetingPlayerId(null)
  }

  const removePlayerMovement = (playerId: string) => {
    setPhases((current) =>
      current.map((phase) => {
        if (phase.id !== currentPhaseId) {
          return phase
        }

        const { [playerId]: removedMovement, ...remainingPlayerMovements } =
          phase.playData.playerMovements
        if (!removedMovement) {
          return phase
        }

        return {
          ...phase,
          playData: {
            ...phase.playData,
            playerMovements: remainingPlayerMovements,
          },
        }
      }),
    )
    const removedMovement = phases.find((phase) => phase.id === currentPhaseId)
      ?.playData.playerMovements[playerId]
    if (removedMovement?.id === selectedPlayerMovementId) {
      setSelectedPlayerMovementId(null)
      playerMovementEditSnapshotRef.current = null
    }
    setTargetingPlayerId(null)
  }

  const selectPlayerMovement = (movementId: string) => {
    const movement = Object.values(
      phases.find((phase) => phase.id === currentPhaseId)?.playData
        .playerMovements ?? {},
    ).find((candidate) => candidate.id === movementId)
    if (!movement) {
      return
    }

    setIsBallSelected(false)
    playerMovementEditSnapshotRef.current = {
      movement: clonePlayerMovement(movement),
      phaseId: currentPhaseId,
    }
    setBallActionTargeting(null)
    setSelectedBallActionId(null)
    ballActionEditSnapshotRef.current = null
    setSelectedPlayerMovementId(movementId)
    setSelectedPlayerId(null)
    setTargetingPlayerId(null)
    setSelectedMovementId(null)
    setActiveMovementDirection(null)
  }

  const movePlayerMovementControl = (
    playerId: string,
    controlPointIndex: number,
    coordinate: PitchCoordinate,
  ) => {
    setPhases((current) =>
      current.map((phase) => {
        if (phase.id !== currentPhaseId) {
          return phase
        }

        const movement = phase.playData.playerMovements[playerId]
        if (!movement) {
          return phase
        }

        const controlPoints = [...movement.controlPoints]
        controlPoints[controlPointIndex] = coordinate
        return {
          ...phase,
          playData: {
            ...phase.playData,
            playerMovements: {
              ...phase.playData.playerMovements,
              [playerId]: { ...movement, controlPoints },
            },
          },
        }
      }),
    )
  }

  const movePlayerMovementDestination = (
    playerId: string,
    destination: PitchCoordinate,
  ) => {
    setPhases((current) =>
      current.map((phase) => {
        if (phase.id !== currentPhaseId) {
          return phase
        }

        const movement = phase.playData.playerMovements[playerId]
        if (!movement) {
          return phase
        }

        return {
          ...phase,
          playData: {
            ...phase.playData,
            playerMovements: {
              ...phase.playData.playerMovements,
              [playerId]: { ...movement, destination },
            },
          },
        }
      }),
    )
  }

  const straightenPlayerMovement = (playerId: string) => {
    setPhases((current) =>
      current.map((phase) => {
        if (phase.id !== currentPhaseId) {
          return phase
        }

        const movement = phase.playData.playerMovements[playerId]
        if (!movement || movement.controlPoints.length === 0) {
          return phase
        }

        return {
          ...phase,
          playData: {
            ...phase.playData,
            playerMovements: {
              ...phase.playData.playerMovements,
              [playerId]: { ...movement, controlPoints: [] },
            },
          },
        }
      }),
    )
  }

  const deselectPlayerMovement = () => {
    setSelectedPlayerMovementId(null)
    playerMovementEditSnapshotRef.current = null
  }

  const finishPlayerMovementEditing = () => {
    deselectPlayerMovement()
  }

  const cancelPlayerMovementEditing = () => {
    const snapshot = playerMovementEditSnapshotRef.current
    if (snapshot && snapshot.phaseId === currentPhaseId) {
      setPhases((current) =>
        current.map((phase) =>
          phase.id === currentPhaseId
            ? {
                ...phase,
                playData: {
                  ...phase.playData,
                  playerMovements: {
                    ...phase.playData.playerMovements,
                    [snapshot.movement.playerId]: clonePlayerMovement(
                      snapshot.movement,
                    ),
                  },
                },
              }
            : phase,
        ),
      )
    }
    deselectPlayerMovement()
  }

  const selectMovementDirection = (direction: MovementDirection) => {
    setBallActionTargeting(null)
    setSelectedBallActionId(null)
    setActiveMovementDirection((current) =>
      current === direction ? null : direction,
    )
    setSelectedMovementId(null)
  }

  const placeMovement = (coordinate: PitchCoordinate) => {
    if (!activeMovementDirection) {
      return
    }

    const placement = createDirectionalArrowPlacement(
      coordinate,
      activeMovementDirection,
    )
    const movement: MovementPlacement = {
      ...placement,
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
    independentMovementSnapshotRef.current = {
      movement: { ...movement },
      phaseId: currentPhaseId,
    }
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
    independentMovementSnapshotRef.current = null
  }

  useEffect(() => {
    if (
      !isBallSelected &&
      !selectedBallActionId &&
      !selectedMovementId &&
      !selectedPlayerId &&
      !selectedPlayerMovementId
    ) {
      return
    }

    const deleteSelectedPitchObject = (event: KeyboardEvent) => {
      if (event.key !== "Delete" && event.key !== "Backspace") {
        return
      }

      const target = event.target as Element | null
      if (
        target?.closest(
          "input, textarea, select, button, a, [contenteditable='true'], [contenteditable='']",
        )
      ) {
        return
      }

      event.preventDefault()
      if (isBallSelected) {
        setPhases((current) =>
          current.map((phase) =>
            phase.id === currentPhaseId
              ? {
                  ...phase,
                  playData: {
                    ...phase.playData,
                    ball: null,
                    ballPossessionPlayerId: null,
                  },
                }
              : phase,
          ),
        )
        setIsBallSelected(false)
        return
      }

      if (selectedPlayerId) {
        removePlayerFromCurrentPhase(selectedPlayerId)
        return
      }

      if (selectedPlayerMovementId) {
        const movement = Object.values(
          phases.find((phase) => phase.id === currentPhaseId)?.playData
            .playerMovements ?? {},
        ).find((candidate) => candidate.id === selectedPlayerMovementId)
        if (movement) {
          removePlayerMovement(movement.playerId)
        }
        return
      }

      if (selectedBallActionId) {
        removeBallAction(selectedBallActionId)
        return
      }

      if (selectedMovementId) {
        removeSelectedMovement()
      }
    }

    window.addEventListener("keydown", deleteSelectedPitchObject)
    return () =>
      window.removeEventListener("keydown", deleteSelectedPitchObject)
  }, [
    currentPhaseId,
    isBallSelected,
    phases,
    selectedBallActionId,
    selectedMovementId,
    selectedPlayerId,
    selectedPlayerMovementId,
  ])

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

      if (event.key === "Escape") {
        event.preventDefault()
        cancelIndependentMovementEditing()
        return
      }
    }

    window.addEventListener("keydown", handleDeleteKey)
    return () => window.removeEventListener("keydown", handleDeleteKey)
  }, [currentPhaseId, selectedMovementId])

  useEffect(() => {
    if (
      !ballActionTargeting &&
      !isBallSelected &&
      !selectedBallActionId &&
      !selectedPlayerId &&
      !selectedPlayerMovementId &&
      !targetingPlayerId
    ) {
      return
    }

    const cancelPlayerInteraction = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return
      }

      event.preventDefault()
      if (isBallSelected) {
        setIsBallSelected(false)
        return
      }
      if (selectedPlayerMovementId) {
        cancelPlayerMovementEditing()
        return
      }
      if (ballActionTargeting) {
        setBallActionTargeting(null)
        setSelectedPlayerId(null)
        ballActionEditSnapshotRef.current = null
        return
      }
      if (selectedBallActionId) {
        cancelBallActionEditing()
        return
      }
      setSelectedPlayerId(null)
      setTargetingPlayerId(null)
      playerMovementEditSnapshotRef.current = null
    }

    window.addEventListener("keydown", cancelPlayerInteraction)
    return () => window.removeEventListener("keydown", cancelPlayerInteraction)
  }, [
    ballActionTargeting,
    isBallSelected,
    selectedBallActionId,
    selectedPlayerId,
    selectedPlayerMovementId,
    targetingPlayerId,
  ])

  const changePhase = (id: string) => {
    setCurrentPhaseId(id)
    setActiveMovementDirection(null)
    setIsBallSelected(false)
    setBallActionTargeting(null)
    setSelectedBallActionId(null)
    setSelectedMovementId(null)
    setSelectedPlayerId(null)
    setSelectedPlayerMovementId(null)
    setTargetingPlayerId(null)
    ballActionEditSnapshotRef.current = null
    independentMovementSnapshotRef.current = null
    playerMovementEditSnapshotRef.current = null
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
            ballActions={currentPhase.playData.ballActions}
            ballActionTargeting={ballActionTargeting}
            ballPossessionPlayerId={
              currentPhase.playData.ballPossessionPlayerId
            }
            isBallSelected={isBallSelected}
            movements={currentPhase.playData.movementRoutes}
            onBallActionCancel={cancelBallActionEditing}
            onBallActionDeselect={deselectBallAction}
            onBallActionPitchTarget={targetKickDestination}
            onBallActionPlayerTarget={targetPassRecipient}
            onBallActionRemove={removeBallAction}
            onBallActionSelect={selectBallAction}
            onBallActionStart={startBallActionTargeting}
            onBallDrop={setBallPossession}
            onBallMove={moveBall}
            onBallRelease={releaseBall}
            onBallSelect={selectBall}
            onKickEndpointMove={moveKickEndpoint}
            onMovementEditCancel={cancelIndependentMovementEditing}
            onMovementEditFinish={finishIndependentMovementEditing}
            onMovementEndpointMove={moveMovementEndpoint}
            onMovementMove={moveMovement}
            onMovementPlace={placeMovement}
            onMovementSelect={(id) => {
              selectIndependentMovement(id)
              if (id) {
                setActiveMovementDirection(null)
                deselectBallAction()
                deselectPlayerMovement()
              }
            }}
            onPassEndpointDrop={dropPassEndpoint}
            onPlayerMovementCancel={cancelPlayerMovementEditing}
            onPlayerMovementControlMove={movePlayerMovementControl}
            onPlayerMovementDestinationMove={movePlayerMovementDestination}
            onPlayerMovementDeselect={deselectPlayerMovement}
            onPlayerMovementFinish={finishPlayerMovementEditing}
            onPlayerMovementRemove={removePlayerMovement}
            onPlayerMovementSelect={selectPlayerMovement}
            onPlayerMovementStart={startPlayerMovement}
            onPlayerMovementStraighten={straightenPlayerMovement}
            onPlayerMovementTarget={setPlayerMovementTarget}
            onPlayerMove={movePlayer}
            onPlayerSelect={selectPlayer}
            playerMovements={currentPhase.playData.playerMovements}
            players={Object.values(currentPhase.playData.playerPositions)}
            selectedBallActionId={selectedBallActionId}
            selectedPlayerId={selectedPlayerId}
            selectedPlayerMovementId={selectedPlayerMovementId}
            selectedMovementId={selectedMovementId}
            targetingPlayerId={targetingPlayerId}
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
      {isHelpOpen && <HelpPanel onClose={() => setIsHelpOpen(false)} />}
      <button
        aria-expanded={isHelpOpen}
        aria-label={isHelpOpen ? "Close Help" : "Open Help"}
        aria-pressed={isHelpOpen}
        className="help-button"
        onClick={() => setIsHelpOpen((open) => !open)}
        type="button"
      >
        <span aria-hidden="true">?</span>
      </button>
    </main>
  )
}
