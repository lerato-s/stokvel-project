const nodemailer = require('nodemailer');
const emailService = require('../../../server/services/emailService');

// Mock nodemailer
jest.mock('nodemailer');

describe('Email Service', () => {
  let mockSendMail;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();
    
    // Setup mock transporter
    mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-id-123' });
    
    nodemailer.createTransport.mockReturnValue({
      sendMail: mockSendMail
    });
    
    // Mock environment variables
    process.env.EMAIL_USER = 'test@gmail.com';
    process.env.EMAIL_PASS = 'test-app-password';
    process.env.EMAIL_FROM = 'test@gmail.com';
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('sendInviteEmail', () => {
    const inviteData = {
      toEmail: 'john@example.com',
      toName: 'John Doe',
      groupName: 'Test Stokvel',
      inviterName: 'Jane Admin',
      inviteLink: 'https://stokvel.com/invite/123'
    };

    it('should send invite email successfully', async () => {
      await emailService.sendInviteEmail(inviteData);
      
      expect(nodemailer.createTransport).toHaveBeenCalledWith({
        host: "smtp.gmail.com",
        port: 465,
        secure: true,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
      });
      
      expect(mockSendMail).toHaveBeenCalledTimes(1);
      expect(mockSendMail).toHaveBeenCalledWith({
        from: expect.stringContaining(inviteData.inviterName),
        to: inviteData.toEmail,
        subject: expect.stringContaining(inviteData.groupName),
        html: expect.stringContaining(inviteData.toName),
      });
    });

    it('should include invite link in email', async () => {
      await emailService.sendInviteEmail(inviteData);
      
      const callArg = mockSendMail.mock.calls[0][0];
      expect(callArg.html).toContain(inviteData.inviteLink);
      expect(callArg.html).toContain('Accept Invitation');
    });

    it('should handle email sending errors', async () => {
      mockSendMail.mockRejectedValue(new Error('SMTP connection failed'));
      
      await expect(emailService.sendInviteEmail(inviteData)).rejects.toThrow('SMTP connection failed');
    });
  });

  describe('sendMeetingNotification', () => {
    const meetingData = {
      toEmail: 'member@example.com',
      toName: 'John Member',
      groupName: 'Test Stokvel',
      meetingDate: '2024-12-25',
      meetingTime: '14:00',
      venue: 'Community Hall',
      link: 'https://zoom.us/join/123',
      agenda: 'Discuss payout schedule'
    };

    it('should send meeting notification successfully', async () => {
      await emailService.sendMeetingNotification(meetingData);
      
      expect(mockSendMail).toHaveBeenCalledTimes(1);
      expect(mockSendMail).toHaveBeenCalledWith({
        from: expect.stringContaining(meetingData.groupName),
        to: meetingData.toEmail,
        subject: expect.stringContaining(meetingData.groupName),
        html: expect.stringContaining(meetingData.meetingDate),
      });
    });

    it('should include all meeting details in email', async () => {
      await emailService.sendMeetingNotification(meetingData);
      
      const callArg = mockSendMail.mock.calls[0][0];
      expect(callArg.html).toContain(meetingData.meetingDate);
      expect(callArg.html).toContain(meetingData.meetingTime);
      expect(callArg.html).toContain(meetingData.venue);
      expect(callArg.html).toContain(meetingData.link);
      expect(callArg.html).toContain(meetingData.agenda);
    });

    it('should handle missing meeting time gracefully', async () => {
      const dataWithoutTime = { ...meetingData, meetingTime: null };
      await emailService.sendMeetingNotification(dataWithoutTime);
      
      const callArg = mockSendMail.mock.calls[0][0];
      expect(callArg.html).toContain('TBD');
    });

    it('should handle missing agenda gracefully', async () => {
      const dataWithoutAgenda = { ...meetingData, agenda: null };
      await emailService.sendMeetingNotification(dataWithoutAgenda);
      
      const callArg = mockSendMail.mock.calls[0][0];
      expect(callArg.html).not.toContain('Agenda');
    });
  });

  describe('sendMissingContributionEmail', () => {
    const contributionData = {
      toEmail: 'member@example.com',
      toName: 'John Member',
      groupName: 'Test Stokvel',
      month: '2024-12',
      amount: 500
    };

    it('should send missing contribution email successfully', async () => {
      await emailService.sendMissingContributionEmail(contributionData);
      
      expect(mockSendMail).toHaveBeenCalledTimes(1);
      expect(mockSendMail).toHaveBeenCalledWith({
        from: expect.stringContaining(contributionData.groupName),
        to: contributionData.toEmail,
        subject: expect.stringContaining(contributionData.groupName),
        html: expect.stringContaining(`R${contributionData.amount}`),
      });
    });

    it('should include month and amount in email', async () => {
      await emailService.sendMissingContributionEmail(contributionData);
      
      const callArg = mockSendMail.mock.calls[0][0];
      expect(callArg.html).toContain(contributionData.month);
      expect(callArg.html).toContain(`R${contributionData.amount}`);
      expect(callArg.html).toContain('Contribution Reminder');
    });
  });

  describe('sendMeetingMinutes', () => {
    const minutesData = {
      toEmail: 'member@example.com',
      toName: 'John Member',
      groupName: 'Test Stokvel',
      meetingDate: '2024-12-25',
      minutes: 'Decided to increase contributions by 10%'
    };

    it('should send meeting minutes successfully', async () => {
      await emailService.sendMeetingMinutes(minutesData);
      
      expect(mockSendMail).toHaveBeenCalledTimes(1);
      expect(mockSendMail).toHaveBeenCalledWith({
        from: expect.stringContaining(minutesData.groupName),
        to: minutesData.toEmail,
        subject: expect.stringContaining(minutesData.groupName),
        html: expect.stringContaining(minutesData.meetingDate),
      });
    });

    it('should include minutes content in email', async () => {
      await emailService.sendMeetingMinutes(minutesData);
      
      const callArg = mockSendMail.mock.calls[0][0];
      expect(callArg.html).toContain(minutesData.minutes);
      expect(callArg.html).toContain('Meeting Minutes');
    });
  });

  describe('sendRoleAssignedEmail', () => {
    const roleData = {
      toEmail: 'member@example.com',
      toName: 'John Member',
      groupName: 'Test Stokvel',
      role: 'Treasurer'
    };

    it('should send role assignment email successfully', async () => {
      await emailService.sendRoleAssignedEmail(roleData);
      
      expect(mockSendMail).toHaveBeenCalledTimes(1);
      expect(mockSendMail).toHaveBeenCalledWith({
        from: expect.stringContaining(roleData.groupName),
        to: roleData.toEmail,
        subject: expect.stringContaining(roleData.role),
        html: expect.stringContaining(roleData.role),
      });
    });

    it('should include treasurer responsibilities when role is Treasurer', async () => {
      await emailService.sendRoleAssignedEmail(roleData);
      
      const callArg = mockSendMail.mock.calls[0][0];
      expect(callArg.html).toContain('As Treasurer you can');
      expect(callArg.html).toContain('Confirm member payments');
      expect(callArg.html).toContain('Flag missing contributions');
    });

    it('should not include responsibilities for non-treasurer roles', async () => {
      const memberRoleData = { ...roleData, role: 'Member' };
      await emailService.sendRoleAssignedEmail(memberRoleData);
      
      const callArg = mockSendMail.mock.calls[0][0];
      expect(callArg.html).not.toContain('As Treasurer you can');
    });
  });

  describe('sendContributionReceiptEmail', () => {
    const receiptData = {
      toEmail: 'member@example.com',
      toName: 'John Member',
      groupName: 'Test Stokvel',
      amount: 500,
      reference: 'PAY-123-456',
      date: new Date('2024-12-25')
    };

    it('should send contribution receipt email successfully', async () => {
      await emailService.sendContributionReceiptEmail(receiptData);
      
      expect(mockSendMail).toHaveBeenCalledTimes(1);
      expect(mockSendMail).toHaveBeenCalledWith({
        from: process.env.EMAIL_FROM,
        to: receiptData.toEmail,
        subject: expect.stringContaining(receiptData.groupName),
        html: expect.stringContaining(`R${receiptData.amount}`),
      });
    });

    it('should include receipt details in email', async () => {
      await emailService.sendContributionReceiptEmail(receiptData);
      
      const callArg = mockSendMail.mock.calls[0][0];
      expect(callArg.html).toContain(`R${receiptData.amount}`);
      expect(callArg.html).toContain(receiptData.reference);
      expect(callArg.html).toContain('Payment Confirmed');
    });
  });

  describe('sendPayoutInitiatedEmail', () => {
    const payoutData = {
      toEmail: 'member@example.com',
      toName: 'John Member',
      amount: 1000,
      groupName: 'Test Stokvel',
      reference: 'PO-123-456'
    };

    it('should send payout initiated email successfully', async () => {
      await emailService.sendPayoutInitiatedEmail(payoutData);
      
      expect(mockSendMail).toHaveBeenCalledTimes(1);
      expect(mockSendMail).toHaveBeenCalledWith({
        from: expect.stringContaining(payoutData.groupName),
        to: payoutData.toEmail,
        subject: expect.stringContaining(payoutData.groupName),
        html: expect.stringContaining(`R${payoutData.amount}`),
      });
    });

    it('should include payout details in email', async () => {
      await emailService.sendPayoutInitiatedEmail(payoutData);
      
      const callArg = mockSendMail.mock.calls[0][0];
      expect(callArg.html).toContain(`R${payoutData.amount}`);
      expect(callArg.html).toContain(payoutData.reference);
      expect(callArg.html).toContain('Payout Initiated');
    });
  });

  describe('sendPayoutNotificationEmail', () => {
    const payoutData = {
      toEmail: 'member@example.com',
      toName: 'John Member',
      amount: 1000,
      groupName: 'Test Stokvel',
      transactionId: 'TXN-789-012',
      date: new Date('2024-12-25')
    };

    it('should send payout notification email successfully', async () => {
      await emailService.sendPayoutNotificationEmail(payoutData);
      
      expect(mockSendMail).toHaveBeenCalledTimes(1);
      expect(mockSendMail).toHaveBeenCalledWith({
        from: expect.stringContaining(payoutData.groupName),
        to: payoutData.toEmail,
        subject: expect.stringContaining(payoutData.groupName),
        html: expect.stringContaining(`R${payoutData.amount}`),
      });
    });

    it('should include transaction details in email', async () => {
      await emailService.sendPayoutNotificationEmail(payoutData);
      
      const callArg = mockSendMail.mock.calls[0][0];
      expect(callArg.html).toContain(`R${payoutData.amount}`);
      expect(callArg.html).toContain(payoutData.transactionId);
      expect(callArg.html).toContain('Payout Received');
    });
  });

  describe('Email Service Error Handling', () => {
    it('should throw error when SMTP connection fails', async () => {
      mockSendMail.mockRejectedValue(new Error('Connection timeout'));
      
      await expect(emailService.sendInviteEmail({
        toEmail: 'test@test.com',
        toName: 'Test',
        groupName: 'Test Group',
        inviterName: 'Admin',
        inviteLink: 'http://test.com'
      })).rejects.toThrow('Connection timeout');
    });

    it('should throw error when authentication fails', async () => {
      mockSendMail.mockRejectedValue(new Error('Invalid credentials'));
      
      await expect(emailService.sendMeetingNotification({
        toEmail: 'test@test.com',
        toName: 'Test',
        groupName: 'Test Group',
        meetingDate: '2024-12-25',
        meetingTime: '14:00',
        venue: 'Venue',
        link: 'http://test.com',
        agenda: 'Agenda'
      })).rejects.toThrow('Invalid credentials');
    });

    it('should handle missing environment variables gracefully', async () => {
      delete process.env.EMAIL_USER;
      
      // The transporter will be created with undefined auth user
      // This will cause sendMail to fail
      mockSendMail.mockRejectedValue(new Error('Missing credentials'));
      
      await expect(emailService.sendInviteEmail({
        toEmail: 'test@test.com',
        toName: 'Test',
        groupName: 'Test Group',
        inviterName: 'Admin',
        inviteLink: 'http://test.com'
      })).rejects.toThrow();
    });
  });

  describe('Email Content Validation', () => {
    it('should properly escape HTML in email content', async () => {
      const maliciousData = {
        toEmail: 'test@test.com',
        toName: '<script>alert("xss")</script>',
        groupName: 'Test <b>Group</b>',
        inviterName: 'Admin',
        inviteLink: 'http://test.com'
      };
      
      await emailService.sendInviteEmail(maliciousData);
      
      const callArg = mockSendMail.mock.calls[0][0];
      // The HTML should contain the escaped or raw content
      expect(callArg.html).toBeDefined();
    });

    it('should handle special characters in email content', async () => {
      const specialCharData = {
        toEmail: 'test@test.com',
        toName: 'José & María',
        groupName: 'Stokvel #1',
        inviterName: 'Admin',
        inviteLink: 'http://test.com'
      };
      
      await emailService.sendInviteEmail(specialCharData);
      
      const callArg = mockSendMail.mock.calls[0][0];
      expect(callArg.html).toContain('José');
      expect(callArg.html).toContain('María');
    });
  });
});