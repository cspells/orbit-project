// LevaWrapper.js
import React from 'react'
import ReactDOM from 'react-dom'
import { Leva, useControls } from 'leva'


function LevaPanel(props) {
    // Destructure to get both values and set function
    const [values, set] = useControls(() => props.config)
  
    React.useEffect(() => {
      props.onChange?.(values)
    }, [values, props.onChange])
  
    // Pass the set function back through props
    React.useEffect(() => {
      if (props.onMount) {
        props.onMount(set)
      }
    }, [])
  
  React.useEffect(() => {
    props.onChange?.(values)
  }, [values, props.onChange])

  return React.createElement(Leva, {
    collapsed: true,  // Start collapsed
    theme: {
      sizes: {
        rootWidth: '420px',    // Increase overall panel width
        numberInputMinWidth: '60px'  // Increase control width
      }
    }
  })
}

export function createLevaControls(config, onChange) {
  const container = document.createElement('div')
  document.body.appendChild(container)
  
  let setValues = null

  ReactDOM.render(
    React.createElement(LevaPanel, {
      config: config,
      onChange: onChange,
      onMount: (set) => {
        setValues = set
      }
    }),
    container
  )

  // Return both cleanup and setter function
  return {
    cleanup: () => {
      ReactDOM.unmountComponentAtNode(container)
      container.remove()
    },
    set: (values) => {
      if (setValues) {
        setValues(values)
      }
    }
  }
}