import {
  DownloadIcon,
  FileIcon,
  UpdateIcon,
  UploadIcon,
} from "@radix-ui/react-icons";
import {
  Flex,
  Text,
  Button,
  Container,
  Heading,
  Box,
  Link,
  Table,
} from "@radix-ui/themes";
import { useCallback, useRef, useState, type ChangeEvent } from "react";

export function Welcome() {
  return (
    <Container>
      <ConvertForm />
    </Container>
  );
}

export default function ConvertForm() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [files, setFiles] = useState<Array<File>>([]);
  const [convertedFiles, setConvertedFiles] = useState<Array<[string, Blob]>>(
    []
  );
  const [isLoadingPython, setIsLoadingPython] = useState(false);
  const [isPythonInstalled, setIsPythonInstalled] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  const onOpenFiles = useCallback(function btnClick() {
    if (inputRef.current) {
      inputRef.current.click();
    }
  }, []);

  const onFileInputChange = useCallback(function onChange(
    e: ChangeEvent<HTMLInputElement>
  ) {
    if (e.target.files) {
      const newFiles = [];
      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[0];
        newFiles.push(file);
      }
      setFiles(newFiles);
    }
  },
  []);

  const convertFiles = useCallback(
    async function convert() {
      if (files.length <= 0) {
        return;
      }

      try {
        setIsConverting(true);

        if (!isPythonInstalled) {
          setIsLoadingPython(true);
        }

        const pyodide = await installPython();

        const newFiles: Array<[string, Blob]> = [];
        for (const file of files) {
          const filename = file.name;
          const arrayBuffer = await file.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          pyodide.FS.writeFile(`/${filename}`, uint8Array);
          console.log("File file loaded into Pyodide");

          const result = pyodide.runPython(`
              from markitdown import MarkItDown
              
              markitdown = MarkItDown()
              result = markitdown.convert("/${filename}")
              result.text_content
            `);

          const blob = new Blob([result], { type: "text/markdown" });
          newFiles.push([file.name, blob]);
        }
        setConvertedFiles(newFiles);
      } catch (error: unknown) {
        console.log("Could not convert file", error);
      } finally {
        setIsConverting(false);
        setIsLoadingPython(false);
      }
    },
    [files, isPythonInstalled]
  );

  const download = useCallback(function downloadConvertedFile(
    name: string,
    blob: Blob
  ) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },
  []);

  return (
    <Flex direction="column" mt="9" px="4" gap="6">
      <input
        type="file"
        id="upload-input"
        ref={inputRef}
        style={{ visibility: "hidden" }}
        onChange={onFileInputChange}
      />
      <Heading size="8">Convert anything to Markdown</Heading>
      <Flex
        direction="column"
        justify="center"
        align="center"
        style={{ borderStyle: "dashed" }}
        minHeight="200px"
      >
        <UploadIcon width="50" height="50" /> <Text>Drop your files here</Text>
      </Flex>
      {files.length > 0 && (
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Filename</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>

          <Table.Body>
            {files.map((file) => {
              const maybeBlob = convertedFiles.find(
                ([filename, _]) => filename === file.name
              );
              if (maybeBlob) {
                return (
                  <Table.Row key={file.name}>
                    <Table.RowHeaderCell>{file.name}</Table.RowHeaderCell>
                    <Table.Cell>
                      <Button
                        variant="soft"
                        onClick={(e) => {
                          e.preventDefault();
                          download(file.name, maybeBlob[1]);
                        }}
                      >
                        <DownloadIcon /> Download converted file
                      </Button>
                    </Table.Cell>
                  </Table.Row>
                );
              }
              return (
                <Table.Row key={file.name}>
                  <Table.RowHeaderCell>{file.name}</Table.RowHeaderCell>
                  <Table.Cell>Pending</Table.Cell>
                </Table.Row>
              );
            })}
          </Table.Body>
        </Table.Root>
      )}

      <Flex justify="between">
        <Button onClick={onOpenFiles} variant="outline">
          <UploadIcon /> Open files
        </Button>
        <Button
          onClick={convertFiles}
          disabled={isLoadingPython || isConverting}
          loading={isLoadingPython || isConverting}
        >
          <UpdateIcon /> Convert files
        </Button>
      </Flex>
    </Flex>
  );
}

// @ts-expect-error: The Pyodide library is globally available
let pyodide = null;

async function installPython() {
  // @ts-expect-error: The Pyodide library is globally available
  if (pyodide) {
    return pyodide
  }
  console.log("loading pyodide");
  // @ts-expect-error: The Pyodide library is globally available
  pyodide = await window.loadPyodide();
  await pyodide.loadPackage("micropip");
  const micropip = pyodide.pyimport("micropip");
  await micropip.install("markitdown");

  return pyodide;
}
