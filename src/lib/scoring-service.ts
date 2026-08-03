import { db } from './db'

export async function getSettingNumber(key: string, defaultValue: number): Promise<number> {
  try {
    const setting = await db.setting.findUnique({ where: { key } })
    if (setting && setting.value) {
      const val = parseFloat(setting.value)
      if (!isNaN(val)) return val
    }
  } catch (err) {
    console.error(`Failed to read setting ${key}:`, err)
  }
  return defaultValue
}

export async function checkReporterPromotionEligibility(reporterId: string) {
  try {
    const reporter = await db.reporter.findUnique({ where: { id: reporterId } })
    if (!reporter) return

    const scoreThreshold = await getSettingNumber('promotion_score_threshold', 100)
    const minApproved = await getSettingNumber('promotion_min_approved', 100)
    const maxWarnings = await getSettingNumber('promotion_max_warnings', 2)
    const demotionScoreThreshold = await getSettingNumber('demotion_score_threshold', 40)

    const isSenior = reporter.role === 'senior' || reporter.canPublishDirectly

    if (!isSenior) {
      // Promotion Eligibility Check
      if (
        reporter.performanceScore >= scoreThreshold &&
        reporter.approvedArticles >= minApproved &&
        reporter.fakeNewsCount === 0 &&
        reporter.warningCount <= maxWarnings
      ) {
        if (reporter.promotionStatus !== 'recommended') {
          await db.reporter.update({
            where: { id: reporterId },
            data: { promotionStatus: 'recommended' },
          })
        }
      } else if (reporter.promotionStatus === 'recommended') {
        await db.reporter.update({
          where: { id: reporterId },
          data: { promotionStatus: 'none' },
        })
      }
    } else {
      // Demotion Eligibility Check
      if (
        reporter.warningCount >= 5 ||
        reporter.fakeNewsCount >= 2 ||
        reporter.performanceScore < demotionScoreThreshold
      ) {
        if (reporter.promotionStatus !== 'demotion_recommended') {
          await db.reporter.update({
            where: { id: reporterId },
            data: { promotionStatus: 'demotion_recommended' },
          })
        }
      } else if (reporter.promotionStatus === 'demotion_recommended') {
        await db.reporter.update({
          where: { id: reporterId },
          data: { promotionStatus: 'none' },
        })
      }
    }
  } catch (err) {
    console.error('Error checking reporter promotion eligibility:', err)
  }
}

export async function processNewsApprovalScore(reporterId: string) {
  try {
    await db.reporter.update({
      where: { id: reporterId },
      data: {
        approvedArticles: { increment: 1 },
        performanceScore: { increment: 10 },
      },
    })
    await checkReporterPromotionEligibility(reporterId)
  } catch (err) {
    console.error('Error updating approval score:', err)
  }
}

export async function processNewsRejectionScore(reporterId: string) {
  try {
    await db.reporter.update({
      where: { id: reporterId },
      data: {
        rejectedArticles: { increment: 1 },
        performanceScore: { decrement: 15 },
      },
    })
    await checkReporterPromotionEligibility(reporterId)
  } catch (err) {
    console.error('Error updating rejection score:', err)
  }
}

export async function issueReporterWarning(reporterId: string, reason?: string) {
  try {
    await db.reporter.update({
      where: { id: reporterId },
      data: {
        warningCount: { increment: 1 },
        performanceScore: { decrement: 20 },
      },
    })
    await checkReporterPromotionEligibility(reporterId)
  } catch (err) {
    console.error('Error issuing warning:', err)
  }
}

export async function flagReporterFakeNews(reporterId: string, newsId?: string) {
  try {
    await db.reporter.update({
      where: { id: reporterId },
      data: {
        fakeNewsCount: { increment: 1 },
        performanceScore: { decrement: 50 },
      },
    })
    await checkReporterPromotionEligibility(reporterId)
  } catch (err) {
    console.error('Error flagging fake news:', err)
  }
}
