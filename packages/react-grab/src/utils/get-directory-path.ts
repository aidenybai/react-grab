export const getDirectoryPath = (filePath: string): string => {
  const lastSlashIndex = filePath.lastIndexOf("/");
  return lastSlashIndex > 0 ? filePath.slice(0, lastSlashIndex) : filePath;
};
