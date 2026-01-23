import { createFromRoot } from 'codama';
import { rootNodeFromAnchor } from '@codama/nodes-from-anchor';
import { renderJavaScriptVisitor } from '@codama/renderers';
import idl from "./target/idl/hello_anchor.json";

// Instantiate Codama.
const codama = createFromRoot(rootNodeFromAnchor(idl));

// Render JavaScript.
const generatedPath = "./target/idl";
codama.accept(renderJavaScriptVisitor(generatedPath));