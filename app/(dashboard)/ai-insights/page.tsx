'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface InsightData {
  summary: string
  recommendations: string[]
  stats: {
    totalToday: number
    donationsCount: number
    pct: number
    campaign: { title: string; goal_amount: number; raised_amount: number } | null
  }
}

interface GoalData {
  strategy: string
  tasks: string[]
  expected_calls: number
}

export default function AIInsightsPage() {
  const [orgId, setOrgId] = useState('')
  const [loading, setLoading] = useState(false)
  const [insights, setInsights] = useState<InsightData | null>(null)
  const [goal, setGoal] = useState<GoalData | null>(null)
  const [showGoalForm, setShowGoalForm] = useState(false)
  const [goalForm, setGoalForm] = useState({ target_today: '', callers_count: '' })
  const [goalLoading, setGoalLoading] = useState(false)
  const today = new Date().toLocaleDateString('he-IL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('org_id').eq('id', user.id).single()
      if (profile?.org_id) setOrgId(profile.org_id)
    }
    init()
  }, [])

  async function fetchInsights() {
    if (!orgId) return
    setLoading(true)
    try {
      const res = await fetch('/api/ai-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'daily_summary', data: { org_id: orgId } }),
      })
      const data = await res.json()
      setInsights(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function fetchGoal() {
    if (!insights?.stats.campaign) return
    setGoalLoading(true)
    try {
      const res = await fetch('/api/ai-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'set_goal',
          data: {
            campaign_name: insights.stats.campaign.title,
            current_raised: insights.stats.campaign.raised_amount,
            goal_amount: insights.stats.campaign.goal_amount,
            callers_count: Number(goalForm.callers_count) || 10,
            target_today: Number(goalForm.target_today) || 0,
          },
        }),
      })
      const data = await res.json()
      setGoal(data)
      setShowGoalForm(false)
    } finally {
      setGoalLoading(false)
    }
  }

  return (
    <div className="space-y-6 max-w-3xl" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ניתוח AI יומי</h1>
          <p className="text-sm text-gray-400 mt-0.5">{today}</p>
        </div>
        <button
          onClick={fetchInsights}
          disabled={loading || !orgId}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-40 flex items-center gap-2"
        >
          {loading ? (
            <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />מנתח...</>
          ) : 'רענן ניתוח'}
        </button>
      </div>

      {!insights && !loading && (
        <Card>
          <CardContent className="py-16 text-center space-y-4">
            <div className="text-5xl"></div>
            <h3 className="font-bold text-gray-800">ניתוח AI יומי</h3>
            <p className="text-gray-500 text-sm">לחץ על "רענן ניתוח" לקבלת סיכום יומי והמלצות</p>
          </CardContent>
        </Card>
      )}

      {insights && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-xs text-gray-500">גויס היום</CardTitle></CardHeader>
              <CardContent><div className="text-xl font-bold text-green-600">₪{insights.stats.totalToday.toLocaleString()}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-xs text-gray-500">תרומות היום</CardTitle></CardHeader>
              <CardContent><div className="text-xl font-bold text-gray-700">{insights.stats.donationsCount}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-xs text-gray-500">השלמת יעד</CardTitle></CardHeader>
              <CardContent><div className="text-xl font-bold text-blue-600">{insights.stats.pct}%</div></CardContent>
            </Card>
          </div>

          {/* Summary */}
          <Card>
            <CardHeader><CardTitle className="text-base">סיכום היום</CardTitle></CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed">{insights.summary}</p>
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card>
            <CardHeader><CardTitle className="text-base">המלצות AI</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {insights.recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-blue-50 rounded-xl">
                  <span className="text-blue-600 font-bold shrink-0">{i + 1}</span>
                  <p className="text-gray-700 text-sm leading-relaxed">{rec}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Goal Setter */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">הגדר יעד יומי עם AI</CardTitle>
                <button
                  onClick={() => setShowGoalForm(!showGoalForm)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  {showGoalForm ? 'ביטול' : 'הגדר יעד'}
                </button>
              </div>
            </CardHeader>
            {showGoalForm && (
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">יעד גיוס להיום (₪)</label>
                    <input
                      type="number"
                      value={goalForm.target_today}
                      onChange={e => setGoalForm(p => ({ ...p, target_today: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                      dir="ltr"
                      placeholder="50000"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-gray-700">מספר טלפנים</label>
                    <input
                      type="number"
                      value={goalForm.callers_count}
                      onChange={e => setGoalForm(p => ({ ...p, callers_count: e.target.value }))}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
                      dir="ltr"
                      placeholder="10"
                    />
                  </div>
                </div>
                <button
                  onClick={fetchGoal}
                  disabled={goalLoading}
                  className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 disabled:opacity-40"
                >
                  {goalLoading ? 'מייצר אסטרטגיה...' : 'קבל אסטרטגיה AI'}
                </button>
              </CardContent>
            )}
            {goal && (
              <CardContent className="border-t border-gray-100 space-y-4">
                <p className="text-gray-700 text-sm leading-relaxed bg-purple-50 p-4 rounded-xl">{goal.strategy}</p>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">משימות להיום:</p>
                  {goal.tasks?.map((task, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <span className="text-purple-500 shrink-0">◆</span>
                      <span>{task}</span>
                    </div>
                  ))}
                </div>
                {goal.expected_calls && (
                  <p className="text-xs text-gray-400">יעד שיחות מוערך: {goal.expected_calls} שיחות</p>
                )}
              </CardContent>
            )}
          </Card>
        </>
      )}
    </div>
  )
}
