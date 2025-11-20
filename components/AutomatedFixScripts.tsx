import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
import { 
  Lightning,
  Check,
  Warning,
  ArrowClockwise,
  Wrench,
  Code,
  ShieldCheck,
  Trash,
  GlobeHemisphereWest,
  Database,
  ClockCounterClockwise,
  Copy,
  Play,
  CheckCircle,
  XCircle
} from '@phosphor-icons/react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { useKV } from '@github/spark/hooks'

interface FixScript {
  id: string
  name: string
  description: string
  category: 'network' | 'cache' | 'dns' | 'port' | 'browser' | 'security'
  severity: 'low' | 'medium' | 'high'
  estimatedTime: string
  icon: React.ReactNode
  execute: () => Promise<{ success: boolean; message: string; details?: string }>
}

interface FixScriptResult {
  scriptId: string
  scriptName: string
  success: boolean
  message: string
  details?: string
  timestamp: string
  duration: number
}

export function AutomatedFixScripts() {
  const [runningScripts, setRunningScripts] = useState<Set<string>>(new Set())
  const [completedScripts, setCompletedScripts] = useState<Set<string>>(new Set())
  const [scriptResults, setScriptResults] = useKV<FixScriptResult[]>('fix-script-results', [])
  const [progress, setProgress] = useState<number>(0)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const fixScripts: FixScript[] = [
    {
      id: 'clear-browser-cache',
      name: 'Clear Browser Cache',
      description: 'Remove all cached files and data from the browser',
      category: 'cache',
      severity: 'low',
      estimatedTime: '5 seconds',
      icon: <Trash size={20} weight="duotone" />,
      execute: async () => {
        try {
          if ('caches' in window) {
            const cacheNames = await caches.keys()
            await Promise.all(cacheNames.map(name => caches.delete(name)))
            return { 
              success: true, 
              message: 'Browser cache cleared successfully',
              details: `Cleared ${cacheNames.length} cache(s)`
            }
          } else {
            return { 
              success: false, 
              message: 'Cache API not supported',
              details: 'Please manually clear cache using browser settings'
            }
          }
        } catch (error) {
          return { 
            success: false, 
            message: 'Failed to clear cache',
            details: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      }
    },
    {
      id: 'clear-local-storage',
      name: 'Clear Local Storage',
      description: 'Remove all locally stored application data',
      category: 'cache',
      severity: 'medium',
      estimatedTime: '1 second',
      icon: <Database size={20} weight="duotone" />,
      execute: async () => {
        try {
          const itemCount = localStorage.length
          localStorage.clear()
          return { 
            success: true, 
            message: 'Local storage cleared',
            details: `Removed ${itemCount} item(s)`
          }
        } catch (error) {
          return { 
            success: false, 
            message: 'Failed to clear local storage',
            details: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      }
    },
    {
      id: 'test-network-connectivity',
      name: 'Test Network Connectivity',
      description: 'Verify connection to multiple test endpoints',
      category: 'network',
      severity: 'low',
      estimatedTime: '10 seconds',
      icon: <GlobeHemisphereWest size={20} weight="duotone" />,
      execute: async () => {
        const endpoints = [
          'https://httpbin.org/get',
          'https://jsonplaceholder.typicode.com/posts/1',
          'https://api.ipify.org?format=json'
        ]
        
        const results = await Promise.allSettled(
          endpoints.map(url => fetch(url).then(r => r.ok))
        )
        
        const successCount = results.filter(r => r.status === 'fulfilled' && r.value).length
        
        if (successCount > 0) {
          return {
            success: true,
            message: `Connected to ${successCount}/${endpoints.length} endpoints`,
            details: endpoints.join(', ')
          }
        } else {
          return {
            success: false,
            message: 'All connectivity tests failed',
            details: 'Check your internet connection or firewall settings'
          }
        }
      }
    },
    {
      id: 'reload-page',
      name: 'Hard Reload Page',
      description: 'Force reload the page bypassing cache',
      category: 'browser',
      severity: 'low',
      estimatedTime: 'Instant',
      icon: <ArrowClockwise size={20} weight="duotone" />,
      execute: async () => {
        setTimeout(() => {
          window.location.reload()
        }, 1000)
        return {
          success: true,
          message: 'Reloading page...',
          details: 'Page will refresh in 1 second'
        }
      }
    },
    {
      id: 'reset-session',
      name: 'Reset Session Data',
      description: 'Clear session storage to reset temporary data',
      category: 'cache',
      severity: 'low',
      estimatedTime: '1 second',
      icon: <ClockCounterClockwise size={20} weight="duotone" />,
      execute: async () => {
        try {
          const itemCount = sessionStorage.length
          sessionStorage.clear()
          return {
            success: true,
            message: 'Session data reset',
            details: `Cleared ${itemCount} session item(s)`
          }
        } catch (error) {
          return {
            success: false,
            message: 'Failed to reset session',
            details: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      }
    },
    {
      id: 'check-cors',
      name: 'Test CORS Configuration',
      description: 'Verify cross-origin resource sharing settings',
      category: 'security',
      severity: 'medium',
      estimatedTime: '5 seconds',
      icon: <ShieldCheck size={20} weight="duotone" />,
      execute: async () => {
        try {
          const response = await fetch('https://httpbin.org/get', { mode: 'cors' })
          if (response.ok) {
            return {
              success: true,
              message: 'CORS is configured correctly',
              details: 'Cross-origin requests are working'
            }
          } else {
            return {
              success: false,
              message: 'CORS check returned non-OK status',
              details: `Status: ${response.status}`
            }
          }
        } catch (error) {
          return {
            success: false,
            message: 'CORS check failed',
            details: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      }
    },
    {
      id: 'validate-ssl',
      name: 'Validate SSL Certificate',
      description: 'Check if the current connection uses valid SSL',
      category: 'security',
      severity: 'high',
      estimatedTime: '2 seconds',
      icon: <ShieldCheck size={20} weight="duotone" />,
      execute: async () => {
        const isSecure = window.location.protocol === 'https:'
        if (isSecure) {
          return {
            success: true,
            message: 'Connection is secure (HTTPS)',
            details: `Protocol: ${window.location.protocol}`
          }
        } else {
          return {
            success: false,
            message: 'Connection is not secure (HTTP)',
            details: 'Consider using HTTPS for secure communication'
          }
        }
      }
    },
    {
      id: 'flush-dns-instructions',
      name: 'Get DNS Flush Commands',
      description: 'Copy platform-specific commands to flush DNS cache',
      category: 'dns',
      severity: 'medium',
      estimatedTime: 'Instant',
      icon: <Code size={20} weight="duotone" />,
      execute: async () => {
        const commands = `DNS Flush Commands by Platform:

Windows:
  ipconfig /flushdns

macOS:
  sudo dscacheutil -flushcache
  sudo killall -HUP mDNSResponder

Linux (systemd):
  sudo systemd-resolve --flush-caches

Linux (nscd):
  sudo /etc/init.d/nscd restart`

        try {
          await navigator.clipboard.writeText(commands)
          return {
            success: true,
            message: 'DNS flush commands copied to clipboard',
            details: 'Run the appropriate command for your operating system'
          }
        } catch {
          return {
            success: false,
            message: 'Could not copy to clipboard',
            details: commands
          }
        }
      }
    },
    {
      id: 'check-service-worker',
      name: 'Check Service Workers',
      description: 'List and manage registered service workers',
      category: 'browser',
      severity: 'low',
      estimatedTime: '3 seconds',
      icon: <Wrench size={20} weight="duotone" />,
      execute: async () => {
        if ('serviceWorker' in navigator) {
          try {
            const registrations = await navigator.serviceWorker.getRegistrations()
            if (registrations.length > 0) {
              return {
                success: true,
                message: `Found ${registrations.length} service worker(s)`,
                details: registrations.map(r => r.scope).join(', ')
              }
            } else {
              return {
                success: true,
                message: 'No service workers registered',
                details: 'Service worker check complete'
              }
            }
          } catch (error) {
            return {
              success: false,
              message: 'Failed to check service workers',
              details: error instanceof Error ? error.message : 'Unknown error'
            }
          }
        } else {
          return {
            success: false,
            message: 'Service workers not supported',
            details: 'Your browser does not support service workers'
          }
        }
      }
    },
    {
      id: 'unregister-service-workers',
      name: 'Unregister Service Workers',
      description: 'Remove all registered service workers',
      category: 'browser',
      severity: 'medium',
      estimatedTime: '5 seconds',
      icon: <Trash size={20} weight="duotone" />,
      execute: async () => {
        if ('serviceWorker' in navigator) {
          try {
            const registrations = await navigator.serviceWorker.getRegistrations()
            await Promise.all(registrations.map(r => r.unregister()))
            return {
              success: true,
              message: `Unregistered ${registrations.length} service worker(s)`,
              details: 'All service workers have been removed'
            }
          } catch (error) {
            return {
              success: false,
              message: 'Failed to unregister service workers',
              details: error instanceof Error ? error.message : 'Unknown error'
            }
          }
        } else {
          return {
            success: false,
            message: 'Service workers not supported',
            details: 'Your browser does not support service workers'
          }
        }
      }
    },
    {
      id: 'test-localhost',
      name: 'Test Localhost Connection',
      description: 'Verify local development server is responding',
      category: 'network',
      severity: 'medium',
      estimatedTime: '3 seconds',
      icon: <GlobeHemisphereWest size={20} weight="duotone" />,
      execute: async () => {
        try {
          const response = await fetch(window.location.origin)
          if (response.ok) {
            return {
              success: true,
              message: 'Localhost is responding',
              details: `Origin: ${window.location.origin}`
            }
          } else {
            return {
              success: false,
              message: 'Localhost returned non-OK status',
              details: `Status: ${response.status}`
            }
          }
        } catch (error) {
          return {
            success: false,
            message: 'Cannot connect to localhost',
            details: error instanceof Error ? error.message : 'Unknown error'
          }
        }
      }
    },
    {
      id: 'copy-system-info',
      name: 'Copy System Information',
      description: 'Copy detailed system and browser info for support',
      category: 'browser',
      severity: 'low',
      estimatedTime: 'Instant',
      icon: <Copy size={20} weight="duotone" />,
      execute: async () => {
        const info = {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
          online: navigator.onLine,
          cookieEnabled: navigator.cookieEnabled,
          origin: window.location.origin,
          hostname: window.location.hostname,
          protocol: window.location.protocol,
          port: window.location.port || '(default)',
          screenResolution: `${window.screen.width}x${window.screen.height}`,
          viewport: `${window.innerWidth}x${window.innerHeight}`,
          timestamp: new Date().toISOString()
        }

        try {
          await navigator.clipboard.writeText(JSON.stringify(info, null, 2))
          return {
            success: true,
            message: 'System information copied to clipboard',
            details: 'Share this with support if needed'
          }
        } catch {
          return {
            success: false,
            message: 'Could not copy to clipboard',
            details: JSON.stringify(info, null, 2)
          }
        }
      }
    }
  ]

  const runScript = async (script: FixScript) => {
    setRunningScripts(prev => new Set(prev).add(script.id))
    setProgress(0)
    
    const startTime = Date.now()
    
    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + 10, 90))
    }, 200)

    try {
      const result = await script.execute()
      const endTime = Date.now()
      const duration = endTime - startTime

      clearInterval(progressInterval)
      setProgress(100)

      const scriptResult: FixScriptResult = {
        scriptId: script.id,
        scriptName: script.name,
        success: result.success,
        message: result.message,
        details: result.details,
        timestamp: new Date().toISOString(),
        duration
      }

      setScriptResults(prev => [scriptResult, ...(prev || []).slice(0, 49)])
      
      setCompletedScripts(prev => new Set(prev).add(script.id))
      
      if (result.success) {
        toast.success(script.name, {
          description: result.message
        })
      } else {
        toast.error(script.name, {
          description: result.message
        })
      }

      setTimeout(() => {
        setCompletedScripts(prev => {
          const newSet = new Set(prev)
          newSet.delete(script.id)
          return newSet
        })
      }, 3000)
    } catch (error) {
      clearInterval(progressInterval)
      toast.error(script.name, {
        description: 'Script execution failed'
      })
    } finally {
      setRunningScripts(prev => {
        const newSet = new Set(prev)
        newSet.delete(script.id)
        return newSet
      })
      setTimeout(() => setProgress(0), 500)
    }
  }

  const runAllScripts = async () => {
    toast.info('Running all fix scripts', {
      description: 'This may take a minute...'
    })

    for (const script of filteredScripts) {
      await runScript(script)
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    toast.success('All scripts completed')
  }

  const clearHistory = () => {
    setScriptResults([])
    toast.success('History cleared')
  }

  const safeScriptResults = scriptResults || []

  const categories = [
    { value: 'all', label: 'All Scripts', count: fixScripts.length },
    { value: 'network', label: 'Network', count: fixScripts.filter(s => s.category === 'network').length },
    { value: 'cache', label: 'Cache', count: fixScripts.filter(s => s.category === 'cache').length },
    { value: 'browser', label: 'Browser', count: fixScripts.filter(s => s.category === 'browser').length },
    { value: 'security', label: 'Security', count: fixScripts.filter(s => s.category === 'security').length },
    { value: 'dns', label: 'DNS', count: fixScripts.filter(s => s.category === 'dns').length },
    { value: 'port', label: 'Ports', count: fixScripts.filter(s => s.category === 'port').length }
  ].filter(c => c.count > 0)

  const filteredScripts = selectedCategory === 'all' 
    ? fixScripts 
    : fixScripts.filter(s => s.category === selectedCategory)

  const getSeverityColor = (severity: FixScript['severity']) => {
    switch (severity) {
      case 'high': return 'text-red-600 bg-red-50'
      case 'medium': return 'text-amber-600 bg-amber-50'
      case 'low': return 'text-blue-600 bg-blue-50'
    }
  }

  const isRunning = (scriptId: string) => runningScripts.has(scriptId)
  const isCompleted = (scriptId: string) => completedScripts.has(scriptId)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-xl">
            <Lightning size={32} weight="duotone" className="text-primary" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Automated Fix Scripts</h2>
            <p className="text-muted-foreground">One-click solutions for common issues</p>
          </div>
        </div>
        <div className="flex gap-2">
          {safeScriptResults.length > 0 && (
            <Button variant="outline" onClick={clearHistory}>
              <Trash size={16} />
              Clear History
            </Button>
          )}
          <Button onClick={runAllScripts} disabled={runningScripts.size > 0}>
            <Play size={16} />
            Run All Scripts
          </Button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        {categories.map(cat => (
          <Button
            key={cat.value}
            variant={selectedCategory === cat.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(cat.value)}
          >
            {cat.label} ({cat.count})
          </Button>
        ))}
      </div>

      {runningScripts.size > 0 && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold">Running scripts...</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredScripts.map((script, index) => (
          <motion.div
            key={script.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className={`relative overflow-hidden transition-all hover:shadow-lg ${
              isRunning(script.id) ? 'ring-2 ring-primary' : ''
            }`}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                      {script.icon}
                    </div>
                    <div>
                      <CardTitle className="text-base">{script.name}</CardTitle>
                      <CardDescription className="text-xs mt-1">
                        {script.estimatedTime}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className={`text-xs ${getSeverityColor(script.severity)}`}>
                    {script.severity}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {script.description}
                </p>
                <Button
                  onClick={() => runScript(script)}
                  disabled={isRunning(script.id)}
                  className="w-full"
                  variant={isCompleted(script.id) ? 'outline' : 'default'}
                >
                  {isRunning(script.id) ? (
                    <>
                      <ArrowClockwise className="animate-spin" size={16} />
                      Running...
                    </>
                  ) : isCompleted(script.id) ? (
                    <>
                      <Check size={16} />
                      Completed
                    </>
                  ) : (
                    <>
                      <Play size={16} />
                      Run Script
                    </>
                  )}
                </Button>
              </CardContent>
              <AnimatePresence>
                {isCompleted(script.id) && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-green-500/10 pointer-events-none flex items-center justify-center"
                  >
                    <CheckCircle size={48} weight="fill" className="text-green-500" />
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>
        ))}
      </div>

      {safeScriptResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClockCounterClockwise size={24} weight="duotone" className="text-primary" />
              Execution History
            </CardTitle>
            <CardDescription>
              Recent script execution results (last 50)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {safeScriptResults.map((result, index) => (
                  <motion.div
                    key={`${result.scriptId}-${result.timestamp}`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.02 }}
                  >
                    <Alert className={result.success ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'}>
                      <div className="flex items-start gap-3">
                        {result.success ? (
                          <CheckCircle size={20} weight="fill" className="text-green-600 flex-shrink-0 mt-0.5" />
                        ) : (
                          <XCircle size={20} weight="fill" className="text-red-600 flex-shrink-0 mt-0.5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-semibold text-sm">{result.scriptName}</h4>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Badge variant="outline" className="text-xs">
                                {result.duration}ms
                              </Badge>
                              <Badge variant="outline" className="text-xs">
                                {new Date(result.timestamp).toLocaleTimeString()}
                              </Badge>
                            </div>
                          </div>
                          <AlertDescription>
                            <p className="text-sm">{result.message}</p>
                            {result.details && (
                              <code className="text-xs bg-muted/50 px-2 py-1 rounded block mt-2 break-all">
                                {result.details}
                              </code>
                            )}
                          </AlertDescription>
                        </div>
                      </div>
                    </Alert>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
