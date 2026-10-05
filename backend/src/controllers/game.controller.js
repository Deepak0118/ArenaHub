import prisma from '../config/prisma.js';

export async function listGames(req, res) {
  const now = new Date();
  
  const games = await prisma.gameConfig.findMany({
    include: {
      resources: {
        select: { id: true, label: true, status: true },
        orderBy: { label: 'asc' },
      },
      disabledForEvents: {
        where: {
          startDate: { lte: now },
          endDate: { gte: now }
        },
        select: { id: true, title: true }
      }
    },
    orderBy: { name: 'asc' },
  });

  res.json({ success: true, games });
}

export async function getGame(req, res) {
  const game = await prisma.gameConfig.findUnique({
    where: { id: req.params.id },
    include: {
      resources: {
        select: { id: true, label: true, status: true, version: true },
        orderBy: { label: 'asc' },
      },
    },
  });

  if (!game) {
    return res.status(404).json({ success: false, message: 'Game not found' });
  }

  res.json({ success: true, game });
}

export async function updateGame(req, res) {
  const {
    participationType, minPlayers, maxPlayers, slotDurationMinutes,
    collectionWindowMinutes, cooldownMinutes, gracePeriodMinutes,
    finePerMinute, fineStrategy, requiresPayment, activityFee,
    rulesText, equipmentProvided, equipmentRequired, isActive
  } = req.body;

  const game = await prisma.gameConfig.findUnique({ where: { id: req.params.id } });
  if (!game) {
    return res.status(404).json({ success: false, message: 'Game not found' });
  }

  const fields = {
    participationType, minPlayers, maxPlayers, slotDurationMinutes,
    collectionWindowMinutes, cooldownMinutes, gracePeriodMinutes,
    finePerMinute, fineStrategy, requiresPayment, activityFee,
    rulesText, equipmentProvided, equipmentRequired, isActive
  };

  const updateData = Object.fromEntries(
    Object.entries(fields).filter(([_, v]) => v !== undefined)
  );

  const updated = await prisma.gameConfig.update({
    where: { id: req.params.id },
    data: updateData,
  });

  res.json({ success: true, game: updated });
}

export async function getAvailability(req, res) {
  const resources = await prisma.resource.findMany({
    where: { gameConfigId: req.params.id },
    select: { id: true, label: true, status: true },
    orderBy: { label: 'asc' },
  });

  res.json({ success: true, resources });
}

export async function addResource(req, res) {
  const { label } = req.body;
  if (!label) {
    return res.status(400).json({ success: false, message: 'Resource label is required' });
  }

  const game = await prisma.gameConfig.findUnique({ where: { id: req.params.id } });
  if (!game) {
    return res.status(404).json({ success: false, message: 'Game not found' });
  }

  const resource = await prisma.resource.create({
    data: {
      gameConfigId: game.id,
      label,
      status: 'AVAILABLE'
    }
  });

  res.json({ success: true, resource });
}

export async function deleteResource(req, res) {
  const { id, resourceId } = req.params;

  const resource = await prisma.resource.findFirst({
    where: { id: resourceId, gameConfigId: id }
  });

  if (!resource) {
    return res.status(404).json({ success: false, message: 'Resource not found' });
  }

  // Cannot delete if currently issued or frozen
  if (resource.status === 'ISSUED' || resource.status === 'FROZEN') {
    return res.status(400).json({ success: false, message: 'Cannot delete a resource currently in use' });
  }

  await prisma.resource.delete({
    where: { id: resourceId }
  });

  res.json({ success: true, message: 'Resource deleted' });
}

export async function updateResourceStatus(req, res) {
  const { id, resourceId } = req.params;
  const { status } = req.body;

  if (!['AVAILABLE', 'MAINTENANCE'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid status update' });
  }

  const resource = await prisma.resource.findFirst({
    where: { id: resourceId, gameConfigId: id }
  });

  if (!resource) {
    return res.status(404).json({ success: false, message: 'Resource not found' });
  }

  if (resource.status === 'ISSUED' || resource.status === 'FROZEN') {
    return res.status(400).json({ success: false, message: 'Cannot update status of a resource currently in use' });
  }

  const updated = await prisma.resource.update({
    where: { id: resourceId },
    data: { status }
  });

  res.json({ success: true, resource: updated });
}
