
/** Styles for ui5 */
export const inputBarStyleTemplate = document.createElement('template');
inputBarStyleTemplate.innerHTML = `
<style>

  .ui5-bar-root .ui5-bar-midcontent-container {
    width: 100%;
  }
  
  
  .ui5-textarea-wrapper {
    border: none !important;
  }
</style>
`;



export const shellBarStyleTemplate = document.createElement('template');
shellBarStyleTemplate.innerHTML = `
<style>
  .ui5-shellbar-title {
    font-size:larger !important;
  }
</style>
`;


export const cardStyleTemplate = document.createElement('template');
cardStyleTemplate.innerHTML = `
<style>
  .ui5-card-root {
    padding:10px;
  }
</style>
`;
