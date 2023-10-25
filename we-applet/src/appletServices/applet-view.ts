
export interface ViewThreadContext {
  detail: string,
  subjectType: string,
  subjectName: string,
}


// /** participation_protocol entry type */
// let viewParticipationProtocol = async (hostElem, hrl: Hrl, context: ViewThreadContext) => {
//   console.log("viewParticipationProtocol()", encodeHashToBase64(hrl[1]), context);
//
//   const happElem = await createThreadsApplet(true);
//
//   /** TODO: Figure out why cell-context doesn't propagate normally via ThreadsApp and has to be inserted again within the slot */
//   const template = html`
//       <cell-context .cell=${happElem.threadsDvm.cell}>
//           <comment-thread-view .threadHash=${encodeHashToBase64(hrl[1])} showInput="true" .subjectName=${context.subjectName} .subjectType=${context.subjectType}></comment-thread-view>
//       </cell-context>
//   `;
//
//   /** Append Elements */
//   console.log("Appending <comment-thread-view> to ThreadsApp...");
//   render(template, happElem);
//   console.log("DONE - Appending <comment-thread-view> to ThreadsApp");
//
//   hostElem.appendChild(happElem); //render(happElem, hostElem);
// }



// /** Path entry type */
//   letViewPath = async (element, hrl: Hrl, context: any) => {
//     //const cellProxy = await asCellProxy(client, hrl, "ThreadsWeApplet", "role_threads");
//     //const proxy: ThreadsProxy = new ThreadsProxy(cellProxy);
//     const spaceElem = html`
//         <div>Before custom element</div>
//
//         <div>After custom element</div>
//     `;
//     render(spaceElem, element);
//   }

