import { useNuxtApp } from "#app";

type SentryCaptureExceptionParams = {
  error: Error | string;
  parentFunctionName: string;
  parentFunctionParams: unknown[];
  accountAddress?: string;
  filePath?: string;
};

const sentryCaptureException = ({
  error,
  parentFunctionName,
  parentFunctionParams,
  accountAddress = "",
  filePath = "",
}: SentryCaptureExceptionParams) => {
  const { $sentryCaptureException, $sentrySetContext } = useNuxtApp();

  const newError = typeof error === "string" ? new Error(error) : error;

  $sentrySetContext(newError.name, {
    error,
    parentFunctionName,
    parentFunctionParams,
    accountAddress,
    filePath,
  });

  $sentryCaptureException(newError, {
    tags: {
      parentFunctionName,
      accountAddress,
    },
    extra: {
      parentFunctionParams,
      filePath,
    },
  });
};

export { sentryCaptureException };
