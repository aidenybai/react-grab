import { stripInvalidXmlCharacters } from "./strip-invalid-xml-characters";

const PLAIN_XML_ATTRIBUTE_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_.-]*$/;

const isSerializableSvgAttribute = (attribute: Attr): boolean => {
  if (attribute.namespaceURI === null) {
    return attribute.name !== "xmlns" && PLAIN_XML_ATTRIBUTE_NAME_PATTERN.test(attribute.name);
  }
  return (
    (attribute.prefix === null || PLAIN_XML_ATTRIBUTE_NAME_PATTERN.test(attribute.prefix)) &&
    PLAIN_XML_ATTRIBUTE_NAME_PATTERN.test(attribute.localName)
  );
};

const sanitizeElementAttributes = (element: Element): void => {
  for (const attribute of [...element.attributes]) {
    if (!isSerializableSvgAttribute(attribute)) {
      element.removeAttributeNode(attribute);
      continue;
    }
    const sanitizedValue = stripInvalidXmlCharacters(attribute.value);
    if (sanitizedValue !== attribute.value) attribute.value = sanitizedValue;
  }
};

export const sanitizeSvgSubtreeForSerialization = (subtreeRoot: Element): void => {
  for (const scriptElement of subtreeRoot.querySelectorAll("script")) scriptElement.remove();
  sanitizeElementAttributes(subtreeRoot);
  for (const descendant of subtreeRoot.querySelectorAll("*")) sanitizeElementAttributes(descendant);
};
