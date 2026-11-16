type IdentifiedPhaseObject = {
  id: string
}

type CloneablePhasePlayData = {
  ballActions: IdentifiedPhaseObject[]
  movementRoutes: IdentifiedPhaseObject[]
  playerMovements: Record<string, IdentifiedPhaseObject>
}

type PhaseObjectIdFactories = {
  ballAction: () => string
  independentMovement: () => string
  playerMovement: () => string
}

export function clonePhasePlayData<T extends CloneablePhasePlayData>(
  playData: T,
  createId: PhaseObjectIdFactories,
): T {
  const clone = structuredClone(playData)

  clone.ballActions.forEach((action) => {
    action.id = createId.ballAction()
  })
  clone.movementRoutes.forEach((movement) => {
    movement.id = createId.independentMovement()
  })
  Object.values(clone.playerMovements).forEach((movement) => {
    movement.id = createId.playerMovement()
  })

  return clone
}
