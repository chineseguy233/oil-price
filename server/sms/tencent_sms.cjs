/**
 * 腾讯云 SMS 发送模块
 * 使用腾讯云 SMS v3.0 SDK (tencentcloud-sdk-nodejs)
 *
 * 环境变量（必需）：
 *   TENCENT_SMS_SECRET_ID     - 密钥 SecretId
 *   TENCENT_SMS_SECRET_KEY    - 密钥 SecretKey
 *   TENCENT_SMS_APP_ID        - SMS 应用 SDK AppId（数字）
 *   TENCENT_SMS_SIGN_NAME     - 短信签名内容
 *   TENCENT_SMS_TEMPLATE_CODE  - 模板 ID（如 "SMS_xxx"）
 *
 * 国内短信模板示例（需要在腾讯云控制台创建）：
 *   模板内容：您的验证码是 {1}，{2} 分钟内有效。如非本人操作，请忽略本短信。
 *   变量顺序：${1}=验证码  ${2}=有效期（分钟）
 */

const tencentcloud = require('tencentcloud-sdk-nodejs');

// 腾讯云 SMS Client（按需加载，减少启动时间）
let smsClient = null;

function getSmsClient() {
    if (smsClient) return smsClient;

    const SecretId = process.env.TENCENT_SMS_SECRET_ID;
    const SecretKey = process.env.TENCENT_SMS_SECRET_KEY;

    if (!SecretId || !SecretKey) {
        throw new Error('缺少腾讯云 SMS 环境变量：TENCENT_SMS_SECRET_ID / TENCENT_SMS_SECRET_KEY');
    }

    const SmsClient = tencentcloud.sms.v20210111.Client;
    smsClient = new SmsClient({
        credential: {
            secretId: SecretId,
            secretKey: SecretKey,
        },
        region: 'ap-guangzhou', // 默认广州区域
        profile: {
            signMethod: 'HmacSHA256',
            endpoint: 'sms.tencentcloudapi.com',
        },
    });

    return smsClient;
}

/**
 * 发送验证码短信
 *
 * @param {string} phone - 手机号（国内 1xx 格式，自动加 +86）
 * @param {string} code - 6位验证码
 * @param {number} expireMinutes - 有效期（分钟），默认 5
 * @returns {Promise<{ success: boolean, message: string }>}
 */
async function sendVerificationCode(phone, code, expireMinutes = 5) {
    // 参数校验
    if (!phone || !/^1\d{10}$/.test(phone)) {
        return { success: false, message: '手机号格式错误' };
    }
    if (!code || !/^\d{6}$/.test(code)) {
        return { success: false, message: '验证码必须为6位数字' };
    }

    const AppId = process.env.TENCENT_SMS_APP_ID;
    const SignName = process.env.TENCENT_SMS_SIGN_NAME;
    const TemplateCode = process.env.TENCENT_SMS_TEMPLATE_CODE;

    if (!AppId || !SignName || !TemplateCode) {
        console.error('[SMS] 缺少配置：TENCENT_SMS_APP_ID / TENCENT_SMS_SIGN_NAME / TENCENT_SMS_TEMPLATE_CODE');
        return { success: false, message: 'SMS 未配置，请联系管理员' };
    }

    // 腾讯云 SMS 手机号格式：'+86' + 手机号
    const PhoneNumber = `+86${phone}`;

    try {
        const client = getSmsClient();

        const result = await client.SendSms({
            SmsSdkAppId: AppId,
            SignName: SignName,
            TemplateId: TemplateCode,
            TemplateParamSet: [code, expireMinutes.toString()],
            PhoneNumberSet: [PhoneNumber],
        });

        // 解析返回
        const sendStatus = result.SendStatusSet?.[0];
        if (!sendStatus) {
            return { success: false, message: 'SMS 响应格式错误' };
        }

        if (sendStatus.code === 'Ok') {
            console.log(`[SMS] 发送成功 → ${phone}，Sid=${sendStatus.sid}`);
            return { success: true, message: '发送成功' };
        } else {
            console.error(`[SMS] 发送失败 → ${phone}：${sendStatus.code} ${sendStatus.message}`);
            return { success: false, message: `发送失败：${sendStatus.message || sendStatus.code}` };
        }
    } catch (err) {
        console.error(`[SMS] 异常 → ${phone}：`, err.message);
        return { success: false, message: `SMS 请求异常：${err.message}` };
    }
}

/**
 * 检查 SMS 是否已配置（用于健康检查）
 */
function isConfigured() {
    return !!(
        process.env.TENCENT_SMS_SECRET_ID &&
        process.env.TENCENT_SMS_SECRET_KEY &&
        process.env.TENCENT_SMS_APP_ID &&
        process.env.TENCENT_SMS_SIGN_NAME &&
        process.env.TENCENT_SMS_TEMPLATE_CODE
    );
}

module.exports = { sendVerificationCode, isConfigured };
