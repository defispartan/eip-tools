import { Markdown } from "@/components/Markdown";
import NLink from "next/link";
import {
  Container,
  Heading,
  Center,
  Text,
  Table,
  Tr,
  Td,
  Th,
  Link,
  HStack,
} from "@chakra-ui/react";
import _validEIPs from "@/data/valid-eips.json";
import { extractEipNumber } from "@/utils";
import { ValidEIPs } from "@/types";

const validEIPs: ValidEIPs = _validEIPs;

const extractMetadata = (text: string) => {
  const regex = /---\n([\s\S]*?)\n---\n([\s\S]*)/;
  const match = text.match(regex);

  if (match) {
    return {
      metadata: match[1],
      markdown: match[2],
    };
  } else {
    return {
      metadata: "",
      markdown: text,
    };
  }
};

type EipMetadataJson = {
  eip: number;
  title: string;
  description: string;
  author: string[];
  "discussions-to": string;
  status: string;
  type: string;
  category: string;
  created: string;
  requires: number[];
};

const convertMetadataToJson = (text: string): EipMetadataJson => {
  const lines = text.split("\n");
  const jsonObject: any = {};

  lines.forEach((line) => {
    const [key, value] = line.split(/: (.+)/);
    if (key && value) {
      if (key.trim() === "eip") {
        jsonObject[key.trim()] = parseInt(value.trim());
      } else if (key.trim() === "requires") {
        jsonObject[key.trim()] = value.split(",").map((v) => parseInt(v));
      } else if (key.trim() === "author") {
        jsonObject[key.trim()] = value
          .split(",")
          .map((author: string) => author.trim());
      } else {
        jsonObject[key.trim()] = value.trim();
      }
    }
  });

  return jsonObject as EipMetadataJson;
};

const EIP = async ({
  params: { eipOrNo },
}: {
  params: {
    eipOrNo: string; // can be of the form `1234`, `eip-1234` or `eip-1234.md` (standard followed by official EIP)
  };
}) => {
  const eipNo = extractEipNumber(eipOrNo);
  const validEIPData = validEIPs[parseInt(eipNo)];
  let isERC = true;

  // fetched server-side (cache: "force-cache" [default])
  let eipMarkdownRes = "";

  // if we have data in validEIPs
  if (validEIPData) {
    eipMarkdownRes = await fetch(validEIPData.markdownPath).then((response) =>
      response.text()
    );
    isERC = validEIPData.isERC;
  } else {
    // if no data in validEIPs (new EIP/ERC created after we generated the validEIPs list)
    // most EIPs are ERCs, so fetching them first
    eipMarkdownRes = await fetch(
      `https://raw.githubusercontent.com/ethereum/ERCs/master/ERCS/erc-${eipNo}.md`
    ).then((response) => response.text());

    // if not an ERC, then EIP
    if (eipMarkdownRes === "404: Not Found") {
      eipMarkdownRes = await fetch(
        `https://raw.githubusercontent.com/ethereum/EIPs/master/EIPS/eip-${eipNo}.md`
      ).then((response) => response.text());
      isERC = false;
    }
  }

  const { metadata, markdown } = extractMetadata(eipMarkdownRes);
  let metadataJson = convertMetadataToJson(metadata);

  return (
    <Center w={"100%"}>
      <Container mt={8} mx={"10rem"} minW="60rem">
        <Heading>
          {isERC ? "ERC" : "EIP"}-{eipNo}: {metadataJson.title}
        </Heading>
        <Text size="md">{metadataJson.description}</Text>
        <Table>
          {metadataJson.author && (
            <Tr>
              <Th>Authors</Th>
              <Td>{metadataJson.author.join(", ")}</Td>
            </Tr>
          )}
          {metadataJson.created && (
            <Tr>
              <Th>Created</Th>
              <Td>{metadataJson.created}</Td>
            </Tr>
          )}
          {metadataJson["discussions-to"] && (
            <Tr>
              <Th>Discussion Link</Th>
              <Td>
                <Link
                  href={metadataJson["discussions-to"]}
                  color={"blue.400"}
                  isExternal
                >
                  {metadataJson["discussions-to"]}
                </Link>
              </Td>
            </Tr>
          )}
          {metadataJson.requires.length > 0 && (
            <Tr>
              <Th>Requires</Th>
              <Td>
                <HStack>
                  {metadataJson.requires.map((req, i) => (
                    <NLink key={i} href={`/eip/${req}`}>
                      <Text
                        color={"blue.400"}
                        _hover={{ textDecor: "underline" }}
                      >
                        {validEIPs[req].isERC ? "ERC" : "EIP"}-{req}
                      </Text>
                    </NLink>
                  ))}
                </HStack>
              </Td>
            </Tr>
          )}
        </Table>
        {markdown === "404: Not Found" ? (
          <Center mt={20}>{markdown}</Center>
        ) : (
          <Markdown md={markdown} />
        )}
      </Container>
    </Center>
  );
};

export default EIP;
