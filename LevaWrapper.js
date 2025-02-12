// LevaWrapper.js
import React from 'react'
import ReactDOM from 'react-dom'
import { Leva, useControls } from 'leva'

function LevaPanel(props) {
  const values = useControls(props.config)
  
  React.useEffect(() => {
    props.onChange?.(values)
  }, [values, props.onChange])

  return React.createElement(Leva)
}

export function createLevaControls(config, onChange) {
  const container = document.createElement('div')
  document.body.appendChild(container)

  // Using createElement instead of JSX
  ReactDOM.render(
    React.createElement(LevaPanel, {
      config: config,
      onChange: onChange
    }),
    container
  )

  return () => {
    ReactDOM.unmountComponentAtNode(container)
    container.remove()
  }
}