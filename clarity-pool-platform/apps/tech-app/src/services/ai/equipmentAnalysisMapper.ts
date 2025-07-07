import { logger } from '../../utils/logger';

export interface EquipmentAnalysisResponse {
  equipmentType?: string;
  equipmentSubtype?: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  condition?: string;
  timerSettings?: {
    onTime?: string;
    offTime?: string;
    duration?: string;
  };
  // Add other fields as needed
}

export interface EquipmentUpdates {
  equipmentType?: string;
  equipmentSubtype?: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  condition?: string;
  timerType?: string;
  timerOnTime?: string;
  timerOffTime?: string;
  // Add other fields as needed
}

export function mapEquipmentAnalysisResponse(response: EquipmentAnalysisResponse): EquipmentUpdates {
  const updates: EquipmentUpdates = {};

  // Map basic equipment data
  if (response.equipmentType) {
    updates.equipmentType = response.equipmentType;
  }
  if (response.equipmentSubtype) {
    updates.equipmentSubtype = response.equipmentSubtype;
  }
  if (response.brand) {
    updates.brand = response.brand;
  }
  if (response.model) {
    updates.model = response.model;
  }
  if (response.serialNumber) {
    updates.serialNumber = response.serialNumber;
  }
  if (response.condition) {
    updates.condition = response.condition;
  }

  // Map pump data if detected
  if (response.equipmentType === 'pump') {
    // Add pump-specific mapping here
  }

  // Map filter data if detected
  if (response.equipmentType === 'filter') {
    // Add filter-specific mapping here
  }

  // Map heater data if detected
  if (response.equipmentType === 'heater') {
    // Add heater-specific mapping here
  }

  // Map sanitizer data if detected
  if (response.equipmentType === 'chlorinator' || response.equipmentType === 'sanitizer') {
    // Add sanitizer-specific mapping here
  }

  // Map timer data if detected
  if (response.timerSettings || response.equipmentType === 'timer') {
    // Timer type detection
    if (response.model?.toLowerCase().includes('mechanical') || 
        response.brand === 'Generic') {
      updates.timerType = 'mechanical';
    } else if (response.model?.toLowerCase().includes('digital')) {
      updates.timerType = 'digital';
    } else if (response.model?.toLowerCase().includes('smart')) {
      updates.timerType = 'smart';
    }
    
    // Map timer settings
    if (response.timerSettings?.onTime) {
      updates.timerOnTime = response.timerSettings.onTime;
    }
    if (response.timerSettings?.offTime) {
      updates.timerOffTime = response.timerSettings.offTime;
    }
    
    logger.info('📝 Mapped timer data:', { 
      type: updates.timerType, 
      onTime: updates.timerOnTime, 
      offTime: updates.timerOffTime 
    }, 'equipment-mapper');
  }

  return updates;
}