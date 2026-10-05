export const getDynamicEquipment = (gameConfig, participantCount) => {
  if (!gameConfig || !gameConfig.name) return [];

  const name = gameConfig.name.toLowerCase();
  
  if (name.includes('table tennis') || name.includes('tt')) {
    return ['1 Table Tennis Bat Per Student', '1 Table Tennis Ball Per Group'];
  }
  
  if (name.includes('badminton')) {
    return ['1 Badminton Racquet Per Student', '1 Shuttlecock Per Group'];
  }
  
  if (name.includes('pickleball')) {
    return ['1 Pickleball Paddle Per Student', '1 Pickleball Per Group'];
  }

  if (name.includes('8 ball pool') || name.includes('pool')) {
    return ['1 Pool Cue Per Student', '1 Set of Billiard Balls Per Group'];
  }

  // Fallback to static equipment from backend
  if (gameConfig.equipmentProvided && gameConfig.equipmentProvided.length > 0) {
    return gameConfig.equipmentProvided;
  }

  return [];
};
