package slack

import (
	"context"
	"encoding/json"
	"log"
	"os"

	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/sns"
)

type Message struct {
	Channel     string   `json:"channel"`
	MessageText string   `json:"message"`
	Attachments []string `json:"attachments"`
	Blocks      any      `json:"blocks"`
}

var (
	client   *sns.Client
	topicARN string
)

func Init() {
	topicARN = os.Getenv("SNS_TOPIC_ARN")
	if topicARN == "" {
		log.Println("slack: SNS_TOPIC_ARN not set, notifications disabled")
		return
	}

	cfg, err := config.LoadDefaultConfig(context.Background())
	if err != nil {
		log.Printf("slack: failed to load AWS config: %v (notifications disabled)", err)
		topicARN = ""
		return
	}

	client = sns.NewFromConfig(cfg)
	log.Println("slack: SNS notifications enabled")
}

func Notify(msg Message) {
	if client == nil || topicARN == "" {
		return
	}

	payload, err := json.Marshal(msg)
	if err != nil {
		log.Printf("slack: failed to marshal message: %v", err)
		return
	}

	_, err = client.Publish(context.Background(), &sns.PublishInput{
		TopicArn: &topicARN,
		Message:  stringPtr(string(payload)),
	})
	if err != nil {
		log.Printf("slack: failed to publish to SNS: %v", err)
	}
}

func stringPtr(s string) *string { return &s }
