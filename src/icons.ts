export const checkedIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
  <path fill="#4CAF50" d="M19,3H5c-1.1,0-1.99,0.9-1.99,2L3,19c0,1.1,0.89,2,1.99,2H19c1.1,0,2-0.9,2-2V5C21,3.9,20.1,3,19,3z M9,17L5,13l1.41-1.41L9,14.17l6.59-6.59L17,8L9,17z"/>
</svg>
`;

export const unCheckedIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
  <path fill="#757575" d="M19,3H5c-1.1,0-1.99,0.9-1.99,2L3,19c0,1.1,0.89,2,1.99,2H19c1.1,0,2-0.9,2-2V5C21,3.9,20.1,3,19,3z"/>
</svg>`;

export const crossIconCircle = (width?: number) => `<svg width="${
  width || 24
}px" height="${
  width || 24
}px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <circle cx="12" cy="12" r="10" stroke="red" stroke-width="2" fill="none"/>
  <line x1="8" y1="8" x2="16" y2="16" stroke="red" stroke-width="2"/>
  <line x1="8" y1="16" x2="16" y2="8" stroke="red" stroke-width="2"/>
</svg>`;

export const progressIcon = (
  width?: number
) => `<svg width="${width}" height="${width}" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
  <circle cx="12" cy="12" r="9.915" fill="none" stroke="#eee" stroke-width="3"/>
  <circle cx="12" cy="12" r="9.915" fill="none" stroke="#00aaff" stroke-width="3" 
          stroke-dasharray="75, 100" stroke-dashoffset="25"/>
</svg>
`;

export const crossIcon = (
  size?: number
) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${
  size || 24
}" height="${size || 24}">
    <path fill="none" stroke="#000" stroke-width="2" d="M18 6L6 18M6 6l12 12"/>
  </svg>`;

export const playIcon = (
  size?: number,
  fillColor?: string
) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size || 16}" height="${
  size || 16
}" fill="${
  fillColor || "currentColor"
}" class="bi bi-play-fill" viewBox="0 0 16 16">
    <path d="m11.596 8.697-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393"/>
  </svg>`;

export const pencilIcon = (
  size?: number,
  fillColor?: string
) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size || 16}" height="${
  size || 16
}" fill="${
  fillColor || "currentColor"
}" class="bi bi-pencil-fill" viewBox="0 0 16 16">
    <path d="M12.854.146a.5.5 0 0 0-.707 0L10.5 1.793 14.207 5.5l1.647-1.646a.5.5 0 0 0 0-.708zm.646 6.061L9.793 2.5 3.293 9H3.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.207zm-7.468 7.468A.5.5 0 0 1 6 13.5V13h-.5a.5.5 0 0 1-.5-.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.5-.5V10h-.5a.5.5 0 0 1-.175-.032l-.179.178a.5.5 0 0 0-.11.168l-2 5a.5.5 0 0 0 .65.65l5-2a.5.5 0 0 0 .168-.11z"/>
  </svg>`;

export const installIcon = (
  size: number = 16,
  fillColor?: string
) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" fill="${
  fillColor || "currentColor"
}" class="bi bi-download" viewBox="0 0 16 16">
    <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5"/>
    <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708z"/>
  </svg>`;

export const closeIcon = (
  size?: number
) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size || 16}" height="${
  size || 16
}" fill="currentColor"
  }" class="bi bi-x-circle" viewBox="0 0 16 16">
    <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16"/>
    <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/>
  </svg>`;

export const addIcon = (
  size?: number
) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size || 16}" height="${
  size || 16
}" fill="currentColor" class="bi bi-plus" viewBox="0 0 16 16">
    <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4"/>
  </svg>`;

export const checkIcon = (
  size?: number
) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size || 16}" height="${
  size || 16
}" fill="currentColor" class="bi bi-check" viewBox="0 0 16 16">
  <path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425z"/>
</svg>`;

export const icreonIcon = (fillColor?: string) => `<svg
                  id="Layer_1"
                  data-name="Layer 1"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 1616.771 606.445"
                  preserveAspectRatio="none">
                  <path
                      fill='${fillColor}'
                      d="M584.849,374.7l-18.03-48.138,4.26-.513c26.254-6.925,44.141-28.562,44.141-59.72,0-38.658-27.7-63.469-65.489-63.469H471.259V404.809h31.446V329.8h33.724l28.086,74.983,50.705.027V374.7H584.849ZM502.705,231.421h42.987c23.368,0,38.082,12.694,38.082,34.908,0,22.5-15,35.2-38.082,35.2H502.705Z"
                  />
                  <path fill='${fillColor}' d="M203.826,202.86h31.447V404.809H203.826Z" />
                  <path
                      fill='${fillColor}'
                      d="M255.752,303.835c0-57.412,43.275-103.86,101.551-103.86,45.872,0,83.088,28.561,95.781,68.374H419.907C408.945,244.4,385.576,229.4,357.88,229.4c-41.543,0-70.971,33.466-70.971,74.144,0,40.967,29.716,74.721,70.971,74.721,27.407,0,50.776-15,61.45-38.659h33.754c-12.981,39.524-49.909,68.085-95.781,68.085C299.027,407.693,255.752,361.246,255.752,303.835Z"
                  />
                  <path
                      fill='${fillColor}'
                      d="M639.74,202.86H768.987v29.427h-97.8v56.257h88.857v27.7H671.187v59.142h97.8v29.427H639.74Z"
                  />
                  <path
                      fill='${fillColor}'
                      d="M779.374,303.835c0-57.412,43.276-103.86,101.552-103.86s101.551,46.448,101.551,103.86S939.2,407.693,880.926,407.693,779.374,361.246,779.374,303.835Zm171.656,0c0-40.967-30.292-73.567-70.1-73.567s-70.394,32.6-70.394,73.567,30.581,73.278,70.394,73.278S951.03,344.8,951.03,303.835Z"
                  />
                  <polygon
                      fill='${fillColor}'
                      points="1106.181 404.782 1165.671 404.809 1165.671 202.86 1135.378 202.86 1135.378 374.7 1126.515 374.7 1062.16 202.886 1002.669 202.86 1002.669 404.809 1032.962 404.809 1032.962 232.969 1041.826 232.969 1106.181 404.782"
                  />
                  <path
                      fill="#386aff"
                      d="M1364.748,287.6H1232.143v32.7h132.605Zm25.161,9.029,23.12-23.119-93.324-93.325-.442-.441-23.12,23.119,93.324,93.324Zm-93.325,107.74-.441.442,23.12,23.12,93.324-93.324.442-.443-23.12-23.119Z"
                  />
              </svg>
          `;

export const svgIconForInstall = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
  <path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm-1 15.293V7h2v10.293l2.146-2.147 1.414 1.414-4.5 4.5-4.5-4.5 1.414-1.414L11 17.293z"/>
</svg>`;
