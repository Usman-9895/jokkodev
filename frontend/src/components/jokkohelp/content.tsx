import type { ContentBlock } from '../../lib/jokkohelp/model';
import {CopyCode} from './copy-code';
export function QuestionContent({ blocks,demo=true }: { blocks: ContentBlock[];demo?:boolean }) {
  return <div className="help-content">{blocks.map((block,index)=>block.kind==='paragraph'?<section key={index}>{block.heading&&<h3>{block.heading}</h3>}<p>{block.text}</p></section>:<div className="help-code" key={index}><div><span>{block.language}{demo?' · démonstration':''}</span><CopyCode text={block.text} language={block.language}/></div><pre tabIndex={0} aria-label={`Extrait ${block.language}, défilement horizontal disponible`}><code>{block.text}</code></pre></div>)}</div>;
}
