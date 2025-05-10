<template>
  <v-container class="mt-10" max-width="600px">
    <v-card elevation="4" class="pa-6">
      <v-card-title class="text-h5 mb-4">Delayed Slack Message Sender</v-card-title>
      <v-card-text>
        <!-- Delay Input Section -->
        <v-row dense>
          <v-col cols="6">
            <v-text-field
              label="Delay"
              v-model="delay"
              type="number"
              min="1"
              required
              @input="validateInputs"
              :error-messages="delayError ? 'Please enter a valid delay' : ''"
              :disabled="isLoading"
              hint="Enter a number"
              persistent-hint
            ></v-text-field>
          </v-col>
          <v-col cols="6">
            <v-select
              v-model="unit"
              :items="units"
              label="Unit"
              required
              :disabled="isLoading"
            ></v-select>
          </v-col>
        </v-row>
        <!-- Message Input -->
        <v-text-field
          label="Slack Message"
          v-model="message"
          required
          class="mt-3"
          @input="validateInputs"
          :error-messages="messageError ? 'Please enter a message' : ''"
          :disabled="isLoading"
          hint="Enter your message content"
          persistent-hint
        ></v-text-field>
        <!-- Webhook URL Input -->
        <v-text-field
          label="Slack Webhook URL"
          v-model="webhook"
          required
          class="mt-3"
          @input="validateInputs"
          :error-messages="webhookError ? 'Please enter a valid webhook URL' : ''"
          :disabled="isLoading"
          placeholder="https://hooks.slack.com/services/..."
          hint="Enter your Slack webhook URL"
          persistent-hint
        ></v-text-field>
        <!-- Countdown Display -->
        <v-alert
          v-if="countdown > 0"
          density="compact"
          type="info"
          class="mt-4"
        >
          Message will be sent in {{ formatCountdown(countdown) }}
        </v-alert>
        <!-- Action Button -->
        <v-btn
          :disabled="!isValid"
          color="primary"
          class="mt-4"
          block
          @click="scheduleMessage"
          :loading="isLoading"
        >
          {{ buttonText }}
        </v-btn>
        <!-- Status Notifications -->
        <v-snackbar
          v-model="snackbar.show"
          :color="snackbar.color"
          :timeout="5000"
          location="top"
        >
          {{ snackbar.text }}
          <template v-slot:actions>
            <v-btn
              variant="text"
              @click="snackbar.show = false"
            >
              Close
            </v-btn>
          </template>
        </v-snackbar>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script>
import { ref, computed, onBeforeUnmount, watch } from 'vue';

export default {
  name: 'App',
  setup() {
    const delay = ref('');
    const unit = ref('seconds');
    const units = ref(['seconds', 'minutes', 'hours']);
    const message = ref('');
    const webhook = ref('');
    const isLoading = ref(false);
    const candidateName = ref('Rex Sobrido');
    const isValid = ref(false);
    const countdown = ref(0);
    const countdownInterval = ref(null);
    
    // Form validation states
    const delayError = ref(false);
    const messageError = ref(false);
    const webhookError = ref(false);
    
    const snackbar = ref({
      show: false,
      text: '',
      color: 'success'
    });
    
    let timer = null;
    
    const buttonText = computed(() => {
      return delay.value
        ? `Send in ${delay.value} ${unit.value}`
        : 'Send';
    });
    
    const validateInputs = () => {
      // Validate delay
      delayError.value = !delay.value || parseInt(delay.value) <= 0;
      // Validate message
      messageError.value = !message.value.trim();
      // Validate webhook URL
      webhookError.value = !webhook.value ||
        !webhook.value.startsWith('https://hooks.slack.com/services/');
      // Overall form validity
      isValid.value = !delayError.value && !messageError.value && !webhookError.value;
    };
    
    const getDelayMs = () => {
      const d = parseInt(delay.value);
      if (unit.value === 'minutes') return d * 60 * 1000;
      if (unit.value === 'hours') return d * 60 * 60 * 1000;
      return d * 1000;
    };
    
    const formatCountdown = (ms) => {
      if (ms <= 0) return '';
      const seconds = Math.floor((ms / 1000) % 60);
      const minutes = Math.floor((ms / (1000 * 60)) % 60);
      const hours = Math.floor((ms / (1000 * 60 * 60)));
      let result = '';
      if (hours > 0) result += `${hours}h `;
      if (minutes > 0 || hours > 0) result += `${minutes}m `;
      result += `${seconds}s`;
      return result.trim();
    };
    
    const startCountdown = (delayMs) => {
      countdown.value = delayMs;
      // Clear any existing countdown
      if (countdownInterval.value) {
        clearInterval(countdownInterval.value);
      }
      // Update countdown every second
      countdownInterval.value = setInterval(() => {
        countdown.value -= 1000;
        if (countdown.value <= 0) {
          clearInterval(countdownInterval.value);
          countdown.value = 0;
        }
      }, 1000);
    };
    
    const scheduleMessage = () => {
      isLoading.value = true;
      const delayMs = getDelayMs();
      const finalText = `From ${candidateName.value}'s Slack Bot: ${message.value}`;
      
      // Show scheduled message notification
      showNotification(`Message scheduled to be sent in ${delay.value} ${unit.value}`, 'info');
      
      // Start countdown
      startCountdown(delayMs);
      
      timer = setTimeout(() => {
        sendMessageToSlack(finalText);
      }, delayMs);
    };
    
    const sendMessageToSlack = async (finalText) => {
      const payload = {
        message: finalText,
        webhook: webhook.value
      };
      
      // Get the current base URL for API endpoints
      // This ensures it works both locally and in production on Vercel
      const apiBaseUrl = window.location.origin;
      const apiUrl = `${apiBaseUrl}/api/send-message`;
      
      console.log('Sending message to API:', apiUrl);
      
      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });
        
        if (!response) {
          throw new Error("No response received from server");
        }
        
        // Get response data
        let data;
        const responseText = await response.text();
        
        try {
          if (responseText && responseText.trim()) {
            data = JSON.parse(responseText);
          }
        } catch (jsonError) {
          console.error('JSON parsing error:', jsonError);
          throw new Error(`Server returned invalid response`);
        }
        
        if (!response.ok) {
          throw new Error(data?.error || `Server error: ${response.status}`);
        }
        
        console.log('Message sent:', data);
        showNotification('Message sent successfully!', 'success');
        
        // Reset form after successful send
        resetForm();
      } catch (error) {
        console.error('Error sending message:', error);
        showNotification(`Error sending message: ${error.message}`, 'error');
      } finally {
        isLoading.value = false;
      }
    };
    
    const showNotification = (text, color) => {
      snackbar.value.text = text;
      snackbar.value.color = color;
      snackbar.value.show = true;
    };
    
    const resetForm = () => {
      delay.value = '';
      message.value = '';
      // Keep the webhook to save user from re-entering it
      validateInputs();
    };
    
    // Watch for changes to validate inputs
    watch([delay, unit, message, webhook], validateInputs);
    
    // Clean up function for Composition API
    onBeforeUnmount(() => {
      // Clear any active timers if component is destroyed
      if (timer) {
        clearTimeout(timer);
      }
      if (countdownInterval.value) {
        clearInterval(countdownInterval.value);
      }
    });
    
    return {
      delay,
      unit,
      units,
      message,
      webhook,
      isLoading,
      isValid,
      snackbar,
      buttonText,
      validateInputs,
      scheduleMessage,
      countdown,
      formatCountdown,
      delayError,
      messageError,
      webhookError
    };
  }
};
</script>

<style scoped>
/* Custom styles can be added here if needed */
</style>