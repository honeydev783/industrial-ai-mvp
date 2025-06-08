
import React, { useState, createContext, useContext } from 'react'
import './App.css'

// Theme Context
const ThemeContext = createContext()

export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}

// Theme Provider Component
const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(false)
  
  const toggleTheme = () => {
    setIsDark(!isDark)
    document.documentElement.setAttribute('data-theme', !isDark ? 'dark' : 'light')
  }

  React.useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
  }, [])

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

// Navigation Component
const Navigation = ({ currentPage, setCurrentPage }) => {
  const { isDark, toggleTheme } = useTheme()

  return (
    <nav className="navigation">
      <div className="nav-brand">
        <h1>Industrial AI</h1>
      </div>
      
      <div className="nav-tabs">
        <button 
          className={`nav-tab ${currentPage === 'qa' ? 'active' : ''}`}
          onClick={() => setCurrentPage('qa')}
        >
          Document Q&A
        </button>
        <button 
          className={`nav-tab ${currentPage === 'training' ? 'active' : ''}`}
          onClick={() => setCurrentPage('training')}
        >
          Training & Validation
        </button>
        <button 
          className={`nav-tab ${currentPage === 'monitoring' ? 'active' : ''}`}
          onClick={() => setCurrentPage('monitoring')}
        >
          Real-Time Monitoring
        </button>
      </div>

      <button className="theme-toggle" onClick={toggleTheme}>
        {isDark ? '☀️' : '🌙'}
      </button>
    </nav>
  )
}

// Document Q&A Component
const DocumentQA = () => {
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState('')
  const [sources, setSources] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  const handleQuestionSubmit = (e) => {
    e.preventDefault()
    setIsLoading(true)
    // Simulate API call
    setTimeout(() => {
      setAnswer("Based on the uploaded documents, this appears to be related to pump maintenance procedures. The recommended action is to check valve alignment and pressure readings.")
      setSources([
        { title: "Pump Maintenance Manual", page: 15 },
        { title: "Process Safety Guidelines", page: 23 }
      ])
      setIsLoading(false)
    }, 1500)
  }

  return (
    <div className="page-content">
      <div className="content-header">
        <h2>Document Q&A</h2>
        <p>Ask questions about your plant documentation and processes</p>
      </div>

      <div className="upload-section">
        <div className="upload-area">
          <div className="upload-icon">📁</div>
          <p>Upload documents (PDF, Word, TXT, CSV)</p>
          <button className="btn btn-primary">Choose Files</button>
        </div>
      </div>

      <form onSubmit={handleQuestionSubmit} className="question-form">
        <div className="input-group">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question about your process or equipment..."
            className="question-input"
          />
          <button type="submit" className="btn btn-primary" disabled={isLoading}>
            {isLoading ? 'Searching...' : 'Ask'}
          </button>
        </div>
      </form>

      {answer && (
        <div className="answer-section">
          <h3>Answer</h3>
          <div className="answer-content">
            <p>{answer}</p>
          </div>
          
          {sources.length > 0 && (
            <div className="sources">
              <h4>Sources</h4>
              <ul>
                {sources.map((source, index) => (
                  <li key={index}>
                    <strong>{source.title}</strong> - Page {source.page}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Training Component
const Training = () => {
  const [userRole, setUserRole] = useState('viewer') // viewer, operator, trainer, admin

  return (
    <div className="page-content">
      <div className="content-header">
        <h2>Training & Validation</h2>
        <p>Train the AI system using historical time-series data</p>
      </div>

      <div className="role-selector">
        <label>User Role:</label>
        <select value={userRole} onChange={(e) => setUserRole(e.target.value)}>
          <option value="viewer">Viewer</option>
          <option value="operator">Operator</option>
          <option value="trainer">Trainer (SME)</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      {userRole === 'trainer' || userRole === 'admin' ? (
        <div className="training-interface">
          <div className="upload-section">
            <h3>Upload Time-Series Data</h3>
            <div className="upload-area">
              <div className="upload-icon">📊</div>
              <p>Upload SCADA/historian data (CSV format)</p>
              <button className="btn btn-primary">Upload Data</button>
            </div>
          </div>

          <div className="annotation-section">
            <h3>Data Annotation</h3>
            <div className="chart-placeholder">
              <p>Interactive time-series chart will appear here</p>
              <div className="chart-mock">
                <div className="chart-line"></div>
                <div className="annotation-marker"></div>
              </div>
            </div>
            
            <div className="annotation-controls">
              <input type="text" placeholder="Event label (e.g., Pump Failure)" />
              <textarea placeholder="Annotation details..."></textarea>
              <button className="btn btn-success">Save Annotation</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="access-restricted">
          <h3>Access Restricted</h3>
          <p>Training features are only available to SME Trainers and Admins.</p>
        </div>
      )}
    </div>
  )
}

// Monitoring Component
const Monitoring = () => {
  const [alerts, setAlerts] = useState([
    { id: 1, type: 'warning', message: 'Pump pressure trending low', time: '2 minutes ago' },
    { id: 2, type: 'info', message: 'System calibration completed', time: '15 minutes ago' },
    { id: 3, type: 'error', message: 'Temperature sensor offline', time: '1 hour ago' }
  ])

  return (
    <div className="page-content">
      <div className="content-header">
        <h2>Real-Time Monitoring</h2>
        <p>Monitor system status and receive intelligent alerts</p>
      </div>

      <div className="monitoring-grid">
        <div className="status-card">
          <h3>System Status</h3>
          <div className="status-indicator online">Online</div>
          <p>All systems operational</p>
        </div>

        <div className="status-card">
          <h3>Active Alerts</h3>
          <div className="alert-count">{alerts.filter(a => a.type === 'error').length}</div>
          <p>Critical alerts</p>
        </div>

        <div className="status-card">
          <h3>Data Points</h3>
          <div className="data-count">1,247</div>
          <p>Signals monitored</p>
        </div>
      </div>

      <div className="alerts-section">
        <h3>Recent Alerts</h3>
        <div className="alerts-list">
          {alerts.map(alert => (
            <div key={alert.id} className={`alert alert-${alert.type}`}>
              <div className="alert-content">
                <span className="alert-message">{alert.message}</span>
                <span className="alert-time">{alert.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Main App Component
export default function App() {
  const [currentPage, setCurrentPage] = useState('qa')

  const renderCurrentPage = () => {
    switch(currentPage) {
      case 'qa': return <DocumentQA />
      case 'training': return <Training />
      case 'monitoring': return <Monitoring />
      default: return <DocumentQA />
    }
  }

  return (
    <ThemeProvider>
      <div className="app">
        <Navigation currentPage={currentPage} setCurrentPage={setCurrentPage} />
        <main className="main-content">
          {renderCurrentPage()}
        </main>
      </div>
    </ThemeProvider>
  )
}
