"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Divider,
  Grid,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { PromptBuilderRef } from "@/frontend/components/shared/PromptBuilder";
import { ProcessNodePropertiesModalProps } from "./ProcessNodePropertiesModal/types";
import useModelManagement from "./ProcessNodePropertiesModal/hooks/useModelManagement";
import useServerConnection from "./ProcessNodePropertiesModal/hooks/useServerConnection";
import useNodeData from "./ProcessNodePropertiesModal/hooks/useNodeData";
import NodeConfiguration from "./ProcessNodePropertiesModal/NodeConfiguration";
import ModelBinding from "./ProcessNodePropertiesModal/ModelBinding";
import ServerTools from "./ProcessNodePropertiesModal/ServerTools";
import PromptTemplateEditor from "./ProcessNodePropertiesModal/PromptTemplateEditor";
import NodeProperties from "./ProcessNodePropertiesModal/NodeProperties";
import { getNodeProperties } from "./ProcessNodePropertiesModal/utils";
import { createLogger } from "@/utils/logger";

const log = createLogger(
  "frontend/components/Flow/FlowManager/FlowBuilder/Modals/ProcessNodePropertiesModal"
);

export const ProcessNodePropertiesModal = ({
  open,
  node,
  onCloseAction,
  onSaveAction,
  flowEdges = [],
  flowNodes = [],
  flowId,
}: ProcessNodePropertiesModalProps) => {
  const { nodeData, setNodeData, handlePropertyChange } = useNodeData(node);
  const [promptTemplate, setPromptTemplate] = useState("");
  const [isModelBound, setIsModelBound] = useState(false);
  const [excludeModelPrompt, setExcludeModelPrompt] = useState(false);
  const [excludeStartNodePrompt, setExcludeStartNodePrompt] = useState(false);

  const {
    models,
    isLoadingModels,
    loadError,
    handleModelSelect,
    handleUnbindModel,
  } = useModelManagement(
    open,
    nodeData,
    setNodeData,
    setPromptTemplate,
    setIsModelBound
  );

  const {
    connectedServers,
    isLoadingServers,
    selectedToolServer,
    serverToolsMap,
    serverStatuses,
    isLoadingTools,
    handleSelectToolServer,
    isLoadingSelectedServerTools,
    selectedNodeId,
  } = useServerConnection(open, node, flowEdges, flowNodes);

  const promptBuilderRef = useRef<PromptBuilderRef>(null);

  const handleInsertToolBinding = (serverName: string, toolName: string) => {
    // Log the parameters and state before processing
    log.debug(
      "handleInsertToolBinding called with parameters",
      JSON.stringify({
        serverName,
        toolName,
        selectedToolServer,
        promptTemplateLength: promptTemplate.length,
        promptBuilderRefExists: !!promptBuilderRef.current,
      })
    );

    // Get the tool description if available
    const tool = serverToolsMap[serverName]?.find((t) => t.name === toolName);
    const toolDescription = tool?.description || "";

    log.debug("serverToolsMap", serverToolsMap);

    // Create the binding in the format that will be visually displayed as a pill
    const binding = `\${_-_-_${serverName}_-_-_${toolName}}`;
    log.debug("serverToolsMap -> servername / toolname", [
      serverName,
      toolName,
    ]);
    log.debug("serverToolsMap -> binding", binding);

    // Add a space before the binding if needed
    const needsSpace =
      promptTemplate.length > 0 &&
      !promptTemplate.endsWith(" ") &&
      !promptTemplate.endsWith("\n");
    const textToInsert = (needsSpace ? " " : "") + binding;

    log.debug(
      "Preparing to insert tool binding",
      JSON.stringify({
        serverName,
        toolName,
        toolDescription,
        binding,
        needsSpace,
        textToInsert,
        currentPromptTemplate: promptTemplate,
      })
    );

    // Use the ref to insert text at the current cursor position
    if (promptBuilderRef.current) {
      log.debug(
        "Inserting text into PromptBuilder",
        JSON.stringify({
          textToInsert,
          promptBuilderMode: promptBuilderRef.current.getMode?.() || "unknown",
        })
      );

      promptBuilderRef.current.insertText(textToInsert);

      // The PromptBuilder's onChange handler will be triggered when we insert text,
      // which will update the promptTemplate state. However, we can also manually
      // update it here to ensure consistency.
      const updatedTemplate = promptTemplate + textToInsert;
      log.debug(
        "Updating prompt template after insertion",
        JSON.stringify({
          originalLength: promptTemplate.length,
          insertedTextLength: textToInsert.length,
          newLength: updatedTemplate.length,
        })
      );

      handlePromptChange(updatedTemplate);
    } else {
      log.error(
        "Failed to insert tool binding: promptBuilderRef.current is null",
        JSON.stringify({
          serverName,
          toolName,
        })
      );
    }
  };

  const handleSave = () => {
    if (node && nodeData) {
      // Make sure to include the prompt template and toggle states in the saved data
      const updatedNodeData = {
        ...nodeData,
        properties: {
          ...nodeData.properties,
          promptTemplate: promptTemplate,
          excludeModelPrompt: excludeModelPrompt,
          excludeStartNodePrompt: excludeStartNodePrompt,
        },
      };
      onSaveAction(node.id, updatedNodeData);
      onCloseAction();
    }
  };

  const handlePromptChange = (value: string) => {
    setPromptTemplate(value);
    // Also update the node data
    setNodeData((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        properties: {
          ...prev.properties,
          promptTemplate: value,
        },
      };
    });
  };

  useEffect(() => {
    if (node) {
      // Always load the prompt template from the node's properties
      const savedPromptTemplate = node.data.properties?.promptTemplate || "";
      setPromptTemplate(savedPromptTemplate);

      // Set model binding status
      if (node.data.properties?.boundModel) {
        setIsModelBound(true);
      } else {
        setIsModelBound(false);
      }

      // Load toggle states from node properties if they exist
      setExcludeModelPrompt(node.data.properties?.excludeModelPrompt || false);
      setExcludeStartNodePrompt(
        node.data.properties?.excludeStartNodePrompt || false
      );
    }
  }, [node, open]);

  if (!node || !nodeData) return null;

  const properties = getNodeProperties();
  const selectedModelId = nodeData.properties?.boundModel || "";

  return (
    <Dialog
      open={open}
      onClose={onCloseAction}
      maxWidth="xl"
      fullWidth
      PaperProps={{
        sx: {
          borderTop: 5,
          borderColor: "secondary.main",
          width: "95vw",
          height: "90vh",
          maxWidth: "95vw",
          maxHeight: "90vh",
        },
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Typography variant="h6">
            {nodeData.label || "Process Node"} Properties
          </Typography>
          <IconButton
            edge="end"
            color="inherit"
            onClick={onCloseAction}
            aria-label="close"
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <Divider />

      <DialogContent
        sx={{
          display: "flex",
          flexDirection: "column",
          p: 3,
          overflow: "auto",
          height: "calc(90vh - 130px)",
        }}
      >
        <Grid container spacing={2} sx={{ flexGrow: 1, height: "100%" }}>
          <Grid
            item
            xs={6}
            sx={{
              display: "flex",
              flexDirection: "column",
              height: "100%",
              overflow: "auto",
            }}
          >
            <Box sx={{ mb: 3 }}>
              <NodeConfiguration
                nodeData={nodeData}
                setNodeData={setNodeData}
              />
            </Box>
            <Box sx={{ mb: 3 }}>
              <ModelBinding
                isLoadingModels={isLoadingModels}
                loadError={loadError}
                models={models}
                selectedModelId={selectedModelId}
                handleModelSelect={handleModelSelect}
                isModelBound={isModelBound}
                handleUnbindModel={handleUnbindModel}
              />
            </Box>
            <Box
              sx={{
                mb: 3,
                display: "flex",
                flexDirection: "column",
                flexGrow: 1,
              }}
            >
              <ServerTools
                isLoadingServers={isLoadingServers}
                connectedServers={connectedServers}
                serverToolsMap={serverToolsMap}
                serverStatuses={serverStatuses}
                isLoadingTools={isLoadingTools}
                handleSelectToolServer={handleSelectToolServer}
                handleInsertToolBinding={handleInsertToolBinding}
                selectedToolServer={selectedToolServer}
                isLoadingSelectedServerTools={isLoadingSelectedServerTools}
                promptBuilderRef={promptBuilderRef}
                flowNodes={flowNodes}
                selectedNodeId={selectedNodeId}
              />
            </Box>
            <Box>
              <NodeProperties
                nodeData={nodeData}
                handlePropertyChange={handlePropertyChange}
                properties={properties}
              />
            </Box>
          </Grid>

          <Grid
            item
            xs={6}
            sx={{ display: "flex", flexDirection: "column", height: "100%" }}
          >
            <PromptTemplateEditor
              ref={promptBuilderRef}
              promptTemplate={promptTemplate}
              handlePromptChange={handlePromptChange}
              excludeModelPrompt={excludeModelPrompt}
              setExcludeModelPrompt={setExcludeModelPrompt}
              excludeStartNodePrompt={excludeStartNodePrompt}
              setExcludeStartNodePrompt={setExcludeStartNodePrompt}
              isModelBound={isModelBound}
              models={models}
              nodeData={nodeData}
              flowId={flowId}
            />
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions>
        <Button onClick={onCloseAction}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProcessNodePropertiesModal;
