import { MEMO_CARRY_INLINE_STYLE_PROPS } from "../constants";

export const isMemoCarriedInlineDeclaration = (
  propertyName: string,
  propertyValue: string,
  propertyPriority: string,
): boolean =>
  MEMO_CARRY_INLINE_STYLE_PROPS.has(propertyName) &&
  propertyPriority === "" &&
  !propertyValue.includes("url(") &&
  !propertyValue.includes("var(");
