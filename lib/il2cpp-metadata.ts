const IL2CPP_METADATA_MAGIC = 0xFAB11BAF;

export interface MetadataHeader {
  magic: number;
  version: number;
  stringLiteralOffset: number;
  stringLiteralCount: number;
  stringLiteralDataOffset: number;
  stringLiteralDataCount: number;
  stringOffset: number;
  stringCount: number;
  eventsOffset: number;
  eventsCount: number;
  propertiesOffset: number;
  propertiesCount: number;
  methodsOffset: number;
  methodsCount: number;
  parameterDefaultValuesOffset: number;
  parameterDefaultValuesCount: number;
  fieldDefaultValuesOffset: number;
  fieldDefaultValuesCount: number;
  fieldAndParameterDefaultValueDataOffset: number;
  fieldAndParameterDefaultValueDataCount: number;
  fieldMarshaledSizesOffset: number;
  fieldMarshaledSizesCount: number;
  parametersOffset: number;
  parametersCount: number;
  fieldsOffset: number;
  fieldsCount: number;
  genericParametersOffset: number;
  genericParametersCount: number;
  genericParameterConstraintsOffset: number;
  genericParameterConstraintsCount: number;
  genericContainersOffset: number;
  genericContainersCount: number;
  nestedTypesOffset: number;
  nestedTypesCount: number;
  interfacesOffset: number;
  interfacesCount: number;
  vtableMethodsOffset: number;
  vtableMethodsCount: number;
  interfaceOffsetsOffset: number;
  interfaceOffsetsCount: number;
  typeDefinitionsOffset: number;
  typeDefinitionsCount: number;
  imagesOffset: number;
  imagesCount: number;
  assembliesOffset: number;
  assembliesCount: number;
  metadataUsageListsOffset: number;
  metadataUsageListsCount: number;
  metadataUsagePairsOffset: number;
  metadataUsagePairsCount: number;
  fieldRefsOffset: number;
  fieldRefsCount: number;
  referencedAssembliesOffset: number;
  referencedAssembliesCount: number;
  attributesInfoOffset: number;
  attributesInfoCount: number;
  attributeTypesOffset: number;
  attributeTypesCount: number;
  unresolvedVirtualCallParameterTypesOffset: number;
  unresolvedVirtualCallParameterTypesCount: number;
  unresolvedVirtualCallParameterRangesOffset: number;
  unresolvedVirtualCallParameterRangesCount: number;
  windowsRuntimeTypeNamesOffset: number;
  windowsRuntimeTypeNamesSize: number;
  exportedTypeDefinitionsOffset: number;
  exportedTypeDefinitionsCount: number;
}

export interface ParsedMetadata {
  valid: boolean;
  error?: string;
  header?: MetadataHeader;
  summary: {
    totalTypes: number;
    totalMethods: number;
    totalFields: number;
    totalStrings: number;
    totalImages: number;
    totalAssemblies: number;
  };
}

export function parseIL2CPPMetadata(buffer: Buffer): ParsedMetadata {
  if (buffer.length < 256) {
    return { valid: false, error: 'File too small', summary: { totalTypes: 0, totalMethods: 0, totalFields: 0, totalStrings: 0, totalImages: 0, totalAssemblies: 0 } };
  }

  const magic = buffer.readUInt32LE(0);
  if (magic !== IL2CPP_METADATA_MAGIC) {
    return { valid: false, error: `Invalid magic 0x${magic.toString(16)}`, summary: { totalTypes: 0, totalMethods: 0, totalFields: 0, totalStrings: 0, totalImages: 0, totalAssemblies: 0 } };
  }

  const version = buffer.readUInt32LE(4);
  let offset = 8;

  const readPair = () => {
    const off = buffer.readUInt32LE(offset); offset += 4;
    const count = buffer.readUInt32LE(offset); offset += 4;
    return { offset: off, count };
  };

  try {
    const stringLiteral = readPair();
    const stringLiteralData = readPair();
    const string = readPair();
    const events = readPair();
    const properties = readPair();
    const methods = readPair();
    const parameterDefaultValues = readPair();
    const fieldDefaultValues = readPair();
    const fieldAndParameterDefaultValueData = readPair();
    const fieldMarshaledSizes = readPair();
    const parameters = readPair();
    const fields = readPair();
    const genericParameters = readPair();
    const genericParameterConstraints = readPair();
    const genericContainers = readPair();
    const nestedTypes = readPair();
    const interfaces = readPair();
    const vtableMethods = readPair();
    const interfaceOffsets = readPair();
    const typeDefinitions = readPair();
    const images = readPair();
    const assemblies = readPair();
    const metadataUsageLists = readPair();
    const metadataUsagePairs = readPair();
    const fieldRefs = readPair();
    const referencedAssemblies = readPair();
    const attributesInfo = readPair();
    const attributeTypes = readPair();
    const unresolvedVirtualCallParameterTypes = readPair();
    const unresolvedVirtualCallParameterRanges = readPair();
    const windowsRuntimeTypeNames = { offset: buffer.readUInt32LE(offset), size: buffer.readUInt32LE(offset + 4) };
    offset += 8;
    const exportedTypeDefinitions = readPair();

    const header: MetadataHeader = {
      magic, version,
      stringLiteralOffset: stringLiteral.offset, stringLiteralCount: stringLiteral.count,
      stringLiteralDataOffset: stringLiteralData.offset, stringLiteralDataCount: stringLiteralData.count,
      stringOffset: string.offset, stringCount: string.count,
      eventsOffset: events.offset, eventsCount: events.count,
      propertiesOffset: properties.offset, propertiesCount: properties.count,
      methodsOffset: methods.offset, methodsCount: methods.count,
      parameterDefaultValuesOffset: parameterDefaultValues.offset, parameterDefaultValuesCount: parameterDefaultValues.count,
      fieldDefaultValuesOffset: fieldDefaultValues.offset, fieldDefaultValuesCount: fieldDefaultValues.count,
      fieldAndParameterDefaultValueDataOffset: fieldAndParameterDefaultValueData.offset, fieldAndParameterDefaultValueDataCount: fieldAndParameterDefaultValueData.count,
      fieldMarshaledSizesOffset: fieldMarshaledSizes.offset, fieldMarshaledSizesCount: fieldMarshaledSizes.count,
      parametersOffset: parameters.offset, parametersCount: parameters.count,
      fieldsOffset: fields.offset, fieldsCount: fields.count,
      genericParametersOffset: genericParameters.offset, genericParametersCount: genericParameters.count,
      genericParameterConstraintsOffset: genericParameterConstraints.offset, genericParameterConstraintsCount: genericParameterConstraints.count,
      genericContainersOffset: genericContainers.offset, genericContainersCount: genericContainers.count,
      nestedTypesOffset: nestedTypes.offset, nestedTypesCount: nestedTypes.count,
      interfacesOffset: interfaces.offset, interfacesCount: interfaces.count,
      vtableMethodsOffset: vtableMethods.offset, vtableMethodsCount: vtableMethods.count,
      interfaceOffsetsOffset: interfaceOffsets.offset, interfaceOffsetsCount: interfaceOffsets.count,
      typeDefinitionsOffset: typeDefinitions.offset, typeDefinitionsCount: typeDefinitions.count,
      imagesOffset: images.offset, imagesCount: images.count,
      assembliesOffset: assemblies.offset, assembliesCount: assemblies.count,
      metadataUsageListsOffset: metadataUsageLists.offset, metadataUsageListsCount: metadataUsageLists.count,
      metadataUsagePairsOffset: metadataUsagePairs.offset, metadataUsagePairsCount: metadataUsagePairs.count,
      fieldRefsOffset: fieldRefs.offset, fieldRefsCount: fieldRefs.count,
      referencedAssembliesOffset: referencedAssemblies.offset, referencedAssembliesCount: referencedAssemblies.count,
      attributesInfoOffset: attributesInfo.offset, attributesInfoCount: attributesInfo.count,
      attributeTypesOffset: attributeTypes.offset, attributeTypesCount: attributeTypes.count,
      unresolvedVirtualCallParameterTypesOffset: unresolvedVirtualCallParameterTypes.offset, unresolvedVirtualCallParameterTypesCount: unresolvedVirtualCallParameterTypes.count,
      unresolvedVirtualCallParameterRangesOffset: unresolvedVirtualCallParameterRanges.offset, unresolvedVirtualCallParameterRangesCount: unresolvedVirtualCallParameterRanges.count,
      windowsRuntimeTypeNamesOffset: windowsRuntimeTypeNames.offset, windowsRuntimeTypeNamesSize: windowsRuntimeTypeNames.size,
      exportedTypeDefinitionsOffset: exportedTypeDefinitions.offset, exportedTypeDefinitionsCount: exportedTypeDefinitions.count
    };

    return {
      valid: true,
      header,
      summary: {
        totalTypes: typeDefinitions.count,
        totalMethods: methods.count,
        totalFields: fields.count,
        totalStrings: string.count,
        totalImages: images.count,
        totalAssemblies: assemblies.count
      }
    };
  } catch (e) {
    return { valid: false, error: 'Parse error', summary: { totalTypes: 0, totalMethods: 0, totalFields: 0, totalStrings: 0, totalImages: 0, totalAssemblies: 0 } };
  }
}
