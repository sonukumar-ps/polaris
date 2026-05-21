export type PositionSizeInput = {
  accountBalance: number;
  entryPrice: number;
  riskPercent: number;
  stopPrice: number;
  targetPrice?: number | null;
};

export type PositionSizeResult = {
  estimatedReward: number | null;
  maxLoss: number;
  notionalValue: number;
  positionSize: number;
  riskPerUnit: number;
  riskRewardRatio: number | null;
};

export function calculatePositionSize(input: PositionSizeInput): PositionSizeResult | null {
  if (
    input.accountBalance <= 0 ||
    input.entryPrice <= 0 ||
    input.riskPercent <= 0 ||
    input.stopPrice <= 0 ||
    input.entryPrice === input.stopPrice
  ) {
    return null;
  }

  const maxLoss = input.accountBalance * (input.riskPercent / 100);
  const riskPerUnit = Math.abs(input.entryPrice - input.stopPrice);
  const positionSize = maxLoss / riskPerUnit;
  const notionalValue = positionSize * input.entryPrice;
  const rewardPerUnit =
    input.targetPrice && input.targetPrice > 0 ? Math.abs(input.targetPrice - input.entryPrice) : null;
  const estimatedReward = rewardPerUnit ? rewardPerUnit * positionSize : null;

  return {
    estimatedReward,
    maxLoss,
    notionalValue,
    positionSize,
    riskPerUnit,
    riskRewardRatio: estimatedReward !== null && maxLoss > 0 ? estimatedReward / maxLoss : null
  };
}
